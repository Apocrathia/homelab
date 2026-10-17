---
title: "Manage organizations"
canonical: https://tenzir.com/docs/guides/platform-management/manage-organizations
source: https://tenzir.com/docs/guides/platform-management/manage-organizations.md
section: "Docs"
---

# Manage organizations

> This guide shows you how to create, configure, and delete organizations in the Tenzir Platform. You’ll learn how to perform these tasks through both the web and the CLI.

This guide shows you how to create, configure, and delete organizations in the Tenzir Platform. You’ll learn how to perform these tasks through both the web and the CLI.

Availability

As a feature preview, organizations are currently available to all users. In the future, they will require the **Professional Edition** or higher. See [tenzir.com/pricing](https://tenzir.com/pricing.md) for details.

## Create an organization

Each user can belong to at most one organization. When you create an organization, you automatically become its first admin.

* Web

  Click **Create Organization** in your user profile and enter a name for your organization.

* CLI

  ```sh
  tenzir-platform org create "Acme Corp"
  ```

  The command outputs the new organization’s ID.

## View organization details

* Web

  Navigate to **Organizations** from your user profile, or click on the organization name in the workspace switcher to see your organization’s overview, including the name, member count, and creation date.

* CLI

  ```sh
  tenzir-platform org info
  ```

  This displays the organization name, ID, number of members, and pending invitations. Only organization admins can see pending invitations.

## Update organization settings

Admins can change the organization name and icon.

* Web

  Click the organization name on the organization page to edit it inline. You can also update the icon URL in the settings section.

* CLI

  Organization settings can currently only be updated through the web.

## Delete an organization

Destructive action

Deleting an organization permanently removes it along with **all of its workspaces** and their contents. This action cannot be undone.

Only admins can delete an organization.

* Web

  Scroll to the **Danger Zone** at the bottom of the organization page and click **Delete Organization**. A confirmation dialog asks you to confirm before proceeding.

* CLI

  ```sh
  tenzir-platform org delete
  ```

## See Also

* [Manage organization members](manage-organization-members.md)
* [Manage organization workspaces](manage-organization-workspaces.md)
* [Platform](../../explanations/platform.md)
