# Org-Action
This action is public action for using private repository more easily

Now this action checkout multiple repository and provide global git credentials in job using Github App.
It reduces multiple checkout steps and also let provide dependency management tools (like npm, poetry) checkout private repository for its dependency.

It provide Github App Token as output. This token can be used with Github CLI or other actions. See examples below.

Before this action, it's very hard and complex to checking out another repository because of authentication.
Default Github token is scoped only workflow's repository and not permitted to checkout another repository even if in same organization.
Using PAT(Personal Access Token) or SSH Key can access another repository, but this credentials depend on user account.
Deploy key is one of solutions, but deploy keys have to be unique to each repository, that mean you need keys as number of repository as you integrate

Github App can solve this problem. Github App can be installed on repository or organization.
We use organization install to access private repositories in organization.

# Usage

```yaml
- uses: ab180/org-action
  with:
    # Github App Id
    # default env.GITHUB_APP_ID
    app_id: ''
    
    # Github App Private Key
    # default env.GITHUB_APP_PRIVATE_KEY
    app_private_key: ''

    # comma-seperated value, supported:
    # - `contents-ro` : git checkout permission
    # - `contents-rw` : git commit and permission, it contains contents-ro also
    # - `actions-rw` : github actions(workflow) read and execute permission
    # - `checks-rw` : github checks read and write permission
    # - `administration-ro` : github administration read only permission
    # - `pull-requests-rw` : github pull-requests read and write permission
    # - `issues-ro` : github issues read only permission
    # - `issues-rw` : github issues read and write permission
    # - `packages-ro` : github packages read only permission
    # - `packages-rw` : github packages read and write permission
    # 
    # default "contents-ro", only checkout
    app_permission: "contents-ro"

    # multiline-input, formatted "<repository>@<ref>: <checkout path>"
    #    
    # repository should exist in same owner of workflow's and able to read with github app token
    # <repository> should be repository name without owner or `<owner>/<name>`
    #    
    # `@<ref>` can be omitted and uses `main` branch by default.
    # if repository is same with workflow's and @ref is omitted, it uses github.ref instead.
    #    
    # be caution order of the lines, this actions delete path before checkout to avoid conflict.
    # outer path should be defined first and inner path should be defined last.
    #    
    # for example,
    # with:
    #   checkout:
    #     ab180/web-server: .
    #     ab180/common-lib: ./lib/common-lib
    checkout: ""
    
    #  current working directory.
    cwd: ${{github.workspace}}
    
  
    # If ture, it add token to git config for checkout
    # default true
    add_git_config: ""
```


# Example
```yaml
env:
  GITHUB_APP_ID: ${{ secrets.GITHUB_APP_ID }}
  GITHUB_APP_PRIVATE_KEY: ${{ secrets.GITHUB_APP_PRIVATE_KEY }}
jobs:
  build:
    steps:
      - id: org-action
        uses: ab180/org-action@main
        with:
          app_permission: "contents-ro,actions-rw"
          checkout: |
            ${{github.repository}}: .
            private-actions-common: .github/actions-common
      - uses: ./.github/actions-common/slack
        with:
          token: ${{secrets.slack_token}}
      - env:
          GH_TOKEN: ${{ steps.org-action.outputs.token }}
        run: |
          gh workflow run deploy.yaml --repo ab180/anothor-repo
```
