---
title: "Manage organization members"
canonical: https://tenzir.com/docs/guides/platform-management/manage-organization-members
source: https://tenzir.com/docs/guides/platform-management/manage-organization-members.md
section: "Docs"
---

# Manage organization members

> This guide shows you how to invite people to your organization, manage existing members, and understand the role-based permission model. You’ll learn how to use both the web and the CLI for these tasks.

This guide shows you how to invite people to your organization, manage existing members, and understand the role-based permission model. You’ll learn how to use both the web and the CLI for these tasks.

## Roles and permissions

Organizations have two roles:

| Capability                     | Admin | Member |
| ------------------------------ | ----- | ------ |
| View organization details      | ✓     | ✓      |
| Access organization workspaces | ✓     | ✓      |
| Create invitations             | ✓     |        |
| Manage invitations             | ✓     |        |
| Add or remove members          | ✓     |        |
| Change member roles            | ✓     |        |
| Create or delete workspaces    | ✓     |        |
| Update organization settings   | ✓     |        |
| Delete organization            | ✓     |        |

An organization must always have at least one admin. You cannot demote or remove the last remaining admin.

## Invite members

Invitations are shareable tokens that allow others to join your organization. Only admins can create invitations. Each invitation expires after 7 days.

* Web

  On the organization page, scroll to the **Invitations** section. Fill in the role (admin or member) and an optional label to help you remember who the invitation is for. Click **Create** to generate the invitation.

  The platform displays a token that you can copy and share with the invitee.

* CLI

  ```sh
  tenzir-platform org invite --role=member --label="for Alice"
  ```

  The command outputs an invitation ID and a token. Share the token with the person you want to invite.

## Accept an invitation

* Web

  Navigate to the invitation link. The page shows the organization name, the role you’ll receive, and the expiration date. Click **Accept** to join.

* CLI

  ```sh
  tenzir-platform org redeem-invitation <token>
  ```

Single organization constraint

A user can only belong to one organization at a time. If you’re already a member of an organization, you must leave it before accepting a new invitation.

## View and manage invitations

Admins can view all invitations and their status.

* Web

  The **Invitations** section on the organization page lists all invitations with color-coded status badges:

  * **Pending** (yellow): Not yet accepted
  * **Accepted** (green): Successfully redeemed
  * **Revoked** (red): Cancelled by an admin

* CLI

  List all invitations:

  ```sh
  tenzir-platform org list-invitations
  ```

  Revoke a pending invitation:

  ```sh
  tenzir-platform org revoke-invitation <invitation_id>
  ```

## Remove a member

Admins can remove any member from the organization. Members can also remove themselves (leave).

```sh
tenzir-platform org remove-member <user_id>
```

Caution

You cannot remove the last remaining admin from an organization.

## Leave an organization

Any member can leave an organization voluntarily, unless they are the last admin.

```sh
tenzir-platform org leave
```

## See Also

* [Manage organizations](manage-organizations.md)
* [Manage organization workspaces](manage-organization-workspaces.md)
* [Platform](../../explanations/platform.md)
