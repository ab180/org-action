import * as core from "@actions/core";
import * as github from "@actions/github";
import { createCommandManager } from "checkout/lib/git-command-manager";
import * as gitSourceProvider from "checkout/lib/git-source-provider";
import * as inputHelper from "checkout/lib/input-helper";
import { getServerUrl } from "checkout/lib/url-helper";
import ensureError from "ensure-error";
import { resolve } from "path";

type CheckoutTarget = {
    owner: string;
    repoName: string;
    ref: string | undefined;
    location: string;
};
export const prepareInput = (): Array<CheckoutTarget> => {
    const checkoutInput = core.getInput("checkout") || "";
    const cwd = core.getInput("cwd", { required: true });
    const owner = github.context.repo.owner;

    return checkoutInput
        .split("\n")
        .filter(x => !!x)
        .map(line => {
            const [repoAndRef, location] = line.split(/\s*:\s*/);
            const [repoNameInput, ref] = repoAndRef.trim().split(/@/);
            const repoName = repoNameInput.startsWith(`${owner}/`)
                ? repoNameInput.split("/")[1]
                : repoNameInput;
            return {
                owner,
                repoName,
                ref,
                location: resolve(cwd, (location || "").trim())
            };
        });
};

export const checkoutRepository = async (
    token: string,
    target: CheckoutTarget
) => {
    process.env["INPUT_REPOSITORY"] = `${target.owner}/${target.repoName}`;
    process.env["INPUT_PATH"] = target.location;
    process.env["INPUT_TOKEN"] = token;
    if (target.repoName === github.context.repo.repo) {
        // if target.ref is not defined, it uses current reference
        process.env["INPUT_TOKEN"] = core.getInput("action_token") || token;
        process.env["INPUT_REF"] = target.ref;
    } else {
        process.env["INPUT_TOKEN"] = token;
        process.env["INPUT_REF"] = target.ref || "main";
    }
    try {
        const sourceSettings = await inputHelper.getInputs();
        await gitSourceProvider.getSource(sourceSettings);
    } catch (error: unknown) {
        core.setFailed(
            `fail to checkout for ${target.owner}/${
                target.repoName
            } : ${ensureError(error)}`
        );
    }
    delete process.env["INPUT_REPOSITORY"];
    delete process.env["INPUT_REF"];
    delete process.env["INPUT_PATH"];
    delete process.env["INPUT_TOKEN"];
};

export const updateGlobalCredential = async (
    token: string,
    workspace: string
) => {
    const git = await createCommandManager(workspace, false);
    const serverUrl = getServerUrl();

    const tokenConfigKey = `http.${serverUrl.origin}/.extraheader`; // "origin" is SCHEME://HOSTNAME[:PORT]
    const basicCredential = Buffer.from(
        `x-access-token:${token}`,
        "utf8"
    ).toString("base64");
    core.setSecret(basicCredential);

    const tokenConfigValue = `AUTHORIZATION: basic ${basicCredential}`;

    const insteadOfKey = `url.${serverUrl.origin}/.insteadOf`; // "origin" is SCHEME://HOSTNAME[:PORT]
    const insteadOfValues: Array<string> = [];
    insteadOfValues.push(`git@${serverUrl.hostname}:`);
    insteadOfValues.push(`ssh://git@${serverUrl.hostname}:`);
    insteadOfValues.push(`git@${serverUrl.hostname}/`);
    insteadOfValues.push(`ssh://git@${serverUrl.hostname}/`);

    try {
        await git.config(tokenConfigKey, tokenConfigValue, true, true);

        for (const insteadOfValue of insteadOfValues) {
            await git.config(insteadOfKey, insteadOfValue, true, true);
        }
    } catch (error) {
        // Unset in case somehow written to the real global config
        core.info(
            "Encountered an error when attempting to configure token. Attempting unconfigure."
        );
        await git.tryConfigUnset(tokenConfigKey, true);
        await git.tryConfigUnset(insteadOfKey, true);
        throw error;
    }
};
