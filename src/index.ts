import * as checkout from "./checkout";
import * as githubApp from "./github_app";

async function run(): Promise<void> {
    const githubInput = githubApp.prepareInput();
    const appToken = await githubApp.installationToken(githubInput);

    const checkoutInputs = checkout.prepareInput();
    checkoutInputs.forEach(inp => checkout.checkoutRepository(appToken, inp));
}

run();
