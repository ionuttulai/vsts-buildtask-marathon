This extension provides a build task to interact with Mesos Marathon API.

This extension installs the following component:
* A build task to call Marathon Api in order to deploy docker application.

___

## Create a generic Connection to your Marathon Url
* Make sure your Marathon is exposed and can be reached over the network.

1. Open the Services page in your Visual Studio Team Services Control Panel
1. In the New Service Endpoint list, choose "Generic"
1. Specify your Marathon URL, and optionnaly username and password (if username is NULL and password is set the extension will use the password as access token: 'Authorization':'token=[passwod]')

___

## Add the Marathon Deploy task to your build or release

1. Edit the build or release you want to update
1. Select the build task "MarathonDeploy" available in the "Deploy" category.
1. Set the parameters :
   * marathonEndpoint
   * marathon identifier (If not set , this identifier is read from marathon.json file)
   * jsonFilePath which contains deployment configuration
   * Checkbox to fail the task when the application was previously scaled to 0
   
___

## Enjoy!


Credits : Alban Kimor, Folly ADJANOH, Alm Team, Cdiscount France.