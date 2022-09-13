import * as core from "@actions/core";
import * as github from "@actions/github";
import {gitSourceProvider, inputHelper} from "checkout/dist";
import ensureError from "ensure-error";
import {resolve} from "path";

type CheckoutTarget = {
  owner: string;
  repoName: string;
  ref: string | undefined;
  location: string;
};
export const prepareInput = (): Array<CheckoutTarget> => {
  const checkoutInput = core.getInput("checkout") || "";
  const cwd = core.getInput("cwd", {required: true});
  const owner = github.context.repo.owner;

  return checkoutInput
    .split("\n")
    .filter(x => !!x)
    .map(line => {
      const [repoAndRef, location] = line.split(/\s*:\s*/);
      const [repoName, ref] = repoAndRef.trim().split(/@/);
      return {
        owner,
        repoName,
        ref,
        location: resolve(cwd, location.trim())
      };
    });
};

export const checkoutRepository = async (
  token: string,
  target: CheckoutTarget
) => {
  process.env["INPUT_repository"] = `${target.owner}/${target.repoName}`;
  process.env["INPUT_ref"] = target.ref;
  process.env["INPUT_path"] = target.location;
  process.env["INPUT_token"] = token;
  try {
    const sourceSettings = await inputHelper.getInputs();
    await gitSourceProvider.getSource(sourceSettings);
  } catch (error: unknown) {
    core.setFailed(
      `fail to checkout for ${target.owner} : ${ensureError(error)}`
    );
  }
  delete process.env["INPUT_repository"];
  delete process.env["INPUT_ref"];
  delete process.env["INPUT_path"];
  delete process.env["INPUT_token"];
};
