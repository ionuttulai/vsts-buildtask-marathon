import tl = require('vsts-task-lib');
import request = require('request');
import fs = require('fs');
import marathonconfig = require('./marathonconfig');
import MarathonConfig = marathonconfig.MarathonConfig;

export class MarathonApi {
    config: MarathonConfig;
    deploymentLaunched: boolean;
    constructor(conf: MarathonConfig) {
        this.config = conf;
    }

    sendToMarathon() {
        let marathonFullAppPath = this.config.baseUrl.concat("/v2/apps/", this.config.identifier)
        marathonFullAppPath = marathonFullAppPath.replace(/([^:]\/)\/+/g, "$1");
        tl._writeLine("marathonFullAppPath : " + marathonFullAppPath);
        let options: (request.UriOptions & request.CoreOptions) = {
            uri: marathonFullAppPath,
            strictSSL: !this.config.allowInvalidSSLCertificate
        };
        if (this.config.useTokenAuthentication) {
            let tokenStr = "token="+this.config.marathonPassword;
            tl._writeLine("using token authentication!");
            options.headers =  { "Authorization" : tokenStr};
        }
        else if (this.config.useBasicAuthentication) {
            tl._writeLine("using basic authentication for user: "+this.config.marathonUser);
            options.auth = {
                user: this.config.marathonUser,
                pass: this.config.marathonPassword
            };
        }

        request(options, this.sendToMarathonCallBack.bind(this))
    }

    sendToMarathonCallBack(error, response, body) {
        tl.debug("Identifier : " + this.config.identifier);
        // Error occured during request.
        if (error) {
            throw new Error("Request marathon error :".concat(error));
        }
        tl.debug(body);
        let jsonResponse = JSON.parse(body);
        switch (response.statusCode) {
            case 401:
            case 403:
                throw new Error("Request marathon permission error :".concat(jsonResponse.message));
            case 404:
                this.createOrUpdateApp(this.config.marathonFilePath);
                break;
            case 200:
                let nbInstances = jsonResponse.app.instances;
                if (nbInstances > 0) {
                    tl.debug("App ".concat(this.config.identifier, " already exists in Marathon. Overriding its config and restarting it to force an image pull"))
                    this.createOrUpdateApp(this.config.marathonFilePath);                   
                } else {
                   if(this.config.failOnScaledTo0){
                        throw new Error("Application was previously scaled to 0. We won't override its config and won't restart it");
                   }
                   else{
                        tl.warning("App ".concat(this.config.identifier, " was previously scaled to 0. Overriding its config and restarting it to force an image pull"))
                        this.createOrUpdateApp(this.config.marathonFilePath);                   
                    }
                }
            }
    }

    createOrUpdateApp(marathonFilePath: string) {
        tl.debug("createOrUpdateApp method. Put request with marathon json file.");
        tl.debug(fs.readFileSync(marathonFilePath).toString());
        let marathonFullAppPath = this.config.baseUrl.concat("/v2/apps/", this.config.identifier);
        marathonFullAppPath = marathonFullAppPath.replace(/([^:]\/)\/+/g, "$1");
        let options: (request.UriOptions & request.CoreOptions) = {
            uri: marathonFullAppPath,
            qs: { force: true }, //Query string data
            method: 'PUT',
            body: fs.createReadStream(marathonFilePath),
            strictSSL: !this.config.allowInvalidSSLCertificate
        };
        if (this.config.useTokenAuthentication) {
            let tokenStr = "token="+this.config.marathonPassword;
            options.headers =  { 
                'content-type' : 'application/json',
                'Authorization' : tokenStr
            };
        }
        else if (this.config.useBasicAuthentication) {
            options.auth = {
                user: this.config.marathonUser,
                pass: this.config.marathonPassword
            };
        }
        request(options, this.createOrUpdateAppCallBack.bind(this));
    }

    createOrUpdateAppCallBack(error, response, body) {
        // Error occured during request.
        if (error) {
            throw new Error("Request marathon deploy error :".concat(error));
        }
        tl.debug(body);
        let jsonResponse = JSON.parse(body);
        if (response.statusCode >= 200 && response.statusCode < 400) {
            // Check if a deployment is in progress (if there is not config did not change, we force a restart to force a Docker image pull)
            if (!this.isDeploymentLaunched())
                this.restartApp()
        } else {
            throw new Error("Marathon deployment error :".concat(jsonResponse.message));
        }
    }

    isDeploymentLaunched() {
        this.deploymentLaunched = false;
        tl.debug("Check if deployment launched for specific application");
        let deploymentUrl = this.config.baseUrl.concat("/v2/deployments");
        deploymentUrl = deploymentUrl.replace(/([^:]\/)\/+/g, "$1");
        let options: request.CoreOptions = {
            strictSSL: !this.config.allowInvalidSSLCertificate
        };
        if (this.config.useTokenAuthentication) {
            let tokenStr = "token="+this.config.marathonPassword;
            options.headers =  { 
                'content-type' : 'application/json',
                'Authorization' : tokenStr
            };
        }
        else if (this.config.useBasicAuthentication) {
            options.auth = {
                user: this.config.marathonUser,
                pass: this.config.marathonPassword
            };
        }
        request(deploymentUrl, options, this.isDeploymentLaunchedCallBack.bind(this))
        return this.deploymentLaunched;
    }

    isDeploymentLaunchedCallBack(error, response, body) {
            // Error occured during request.
            if (error) {
                throw new Error("Request marathon error :".concat(error));
            }
            tl.debug(body);
            let jsonResponse = JSON.parse(body);
            let runningDeploymentMatcher = new RegExp(this.config.identifier.concat("\""), "i").exec(body.trim());
            if (runningDeploymentMatcher) {
                this.deploymentLaunched = true;
            }
        }

    restartApp() {
        tl.debug("Restart Application");
        let restartUrl = this.config.baseUrl.concat("/v2/apps/", this.config.identifier , "/restart");
        restartUrl = restartUrl.replace(/([^:]\/)\/+/g, "$1");
        let options: (request.UriOptions & request.CoreOptions) = {
            uri: restartUrl,
            qs: { force: true }, //Query string data
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            strictSSL: !this.config.allowInvalidSSLCertificate
        };
        if (this.config.useTokenAuthentication) {
            let tokenStr = "token="+this.config.marathonPassword;
            options.headers =  { 
                'content-type' : 'application/json',
                'Authorization' : tokenStr
            };
        }
        else if (this.config.useBasicAuthentication) {
            options.auth = {
                user: this.config.marathonUser,
                pass: this.config.marathonPassword
            };
        }
        request(options, this.restartAppCallBack.bind(this))
    }

    restartAppCallBack(error, response, body) {
        // Error occured during request.
        if (error) {
            throw new Error("Request marathon restart App error :".concat(error));
        }
        tl.debug(body);
        let jsonResponse = JSON.parse(body);
        if (response.statusCode == 200) {
            // Check deployment
        } else {
            throw new Error("Marathon restart error :".concat(jsonResponse.message));
        }
    }
}