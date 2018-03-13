export class MarathonConfig {
    baseUrl: string;
    identifier: string;
    marathonUser: string;
    marathonPassword: string;
    useBasicAuthentication: boolean;
    marathonFilePath: string;
    failOnScaledTo0: boolean;
    allowInvalidSSLCertificate: boolean;
    toString() {
        var sep = "\n";
        return "Url: ".concat(this.baseUrl, sep, "Identifier: ", this.identifier);
    }
}