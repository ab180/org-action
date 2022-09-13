import * as core from "@actions/core";

import * as checkout from "./checkout";
import { updateGlobalCredential } from "./checkout";
import * as githubApp from "./github_app";

async function run(): Promise<void> {
    const githubInput = githubApp.prepareInput();
    const appToken = await githubApp.installationToken(githubInput);
    core.setOutput("token", appToken);
    core.exportVariable("GITHUB_APP_TOKEN", appToken);

    const checkoutInputs = checkout.prepareInput();
    for (const inp of checkoutInputs) {
        await checkout.checkoutRepository(appToken, inp);
    }

    if (core.getInput("add_git_config").toLowerCase() === "true") {
        await updateGlobalCredential(
            appToken,
            core.getInput("cwd", { required: true })
        );
    }
}

run();
