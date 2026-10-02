// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: RevenueDot Enterprise (the paid ee/ folder) in the OpenAPI document: the licence status, organizations,
// custom roles and group role mappings, single sign-on (SAML 2.0, OpenID Connect), SCIM 2.0 and compliance exports.
// These routes exist only on a server with REVENUEDOT_LICENSE_KEY (or REVENUEDOT_EE_DEV=true for development).
// Docs: https://revenuedot.app/docs/guides/enterprise   Server code: ee/server in revenuedot/revenuedot
import { NONE, SESSION, arr, bool, en, int, listOf, ms, nint, nms, nstr, obj, ok, op, param, ref, str, v2Errors } from "./common.mjs";

const SRC = { index: "ee/server/index.ts", orgs: "ee/server/orgs.ts", exports: "ee/server/exports.ts", sso: "ee/server/sso/routes.ts", domains: "ee/server/sso/domains.ts", scim: "ee/server/scim/routes.ts" };
const O = "/v2/organizations/{org_id}";
const path = (name, description) => ({ name, in: "path", required: true, schema: str(), description });
const org = path("org_id", "Organization id (org_...).");
const page = [param("Limit"), param("StartingAfter")];
const E = (...c) => v2Errors(401, 403, ...c);
const json = (schema, description = "", example) => ({ required: true, content: { "application/json": { schema, ...(example !== undefined ? { example } : {}) } } });
const list = (schema, description, example) => ok(description, listOf(schema), example);
/** Dashboard-session operations of the enterprise extension. */
const ee = (o) => op({ security: SESSION, extension: true, ...o });
/** Marks a component schema as enterprise-only, so the drift check skips it on a checkout without ee/server. */
const enterprise = (schema) => ({ ...schema, "x-revenuedot-enterprise": true });
const ORG_ROLES = ["owner", "admin", "member"];
const REGIONS = ["us", "eu"];

const SSO_RULE = "When the organization requires single sign-on, people on its verified domains other than owners need a session that began with its SSO (403 otherwise).";
const ADMIN = `Organization owners and admins. ${SSO_RULE}`;
const MEMBER = `Any active member of the organization. ${SSO_RULE}`;
const OWNER = "Organization owners only.";

// ---- Objects --------------------------------------------------------------------------------------------------------
const orgExample = {
  object: "organization", id: "org_k2m9q4x7z1a8", name: "Acme Inc.", your_role: "owner", region: "us", region_name: "United States",
  selectable_regions: ["us", "eu"], region_enforced: false, audit_retention_days: 365, sso_enforced: true, seats: { purchased: 50, used: 23 },
  billing_email: "finance@acme.com", member_count: 23, project_count: 3, features: ["organizations", "custom_roles", "sso", "scim", "data_location", "audit_retention", "compliance_exports"],
  created_at: 1790800914012, updated_at: 1790887314012,
};
const roleExample = {
  object: "custom_role", id: "role_8f2kq0x1m3zv", name: "Support agent", description: "Refunds and customer lookups, no catalog changes.",
  scopes: ["customer_information:customers:read", "customer_information:purchases:read_write", "customer_information:subscriptions:read_write"], project_id: null, member_count: 4,
  created_at: 1790800914012, updated_at: 1790800914012,
};
const mappingExample = { object: "role_mapping", id: "map_4f8k2m9q1x7z", group: "RevenueDot Support", project_id: "proj18pzzkao", project_name: "Scanner", role: "role_8f2kq0x1m3zv", role_name: "Support agent", created_at: 1790800914012 };
const samlConnExample = {
  object: "sso_connection", id: "ssoc_p3k8x2m4q9z1", org_id: "org_k2m9q4x7z1a8", kind: "saml", name: "Okta", enabled: true, jit: true, created_at: 1790800914012, updated_at: 1790800914012,
  saml: { idp_entity_id: "http://www.okta.com/exk1a2b3c4d5", idp_sso_url: "https://acme.okta.com/app/acme_revenuedot_1/exk1a2b3c4d5/sso/saml", idp_certificates: ["-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----"], allow_idp_initiated: false, email_attribute: null, first_name_attribute: null, last_name_attribute: null, groups_attribute: "groups" },
  sp: { entity_id: "https://app.revenuedot.app/sso/saml/ssoc_p3k8x2m4q9z1/metadata", acs_url: "https://app.revenuedot.app/sso/saml/ssoc_p3k8x2m4q9z1/acs", metadata_url: "https://app.revenuedot.app/sso/saml/ssoc_p3k8x2m4q9z1/metadata", start_url: "https://app.revenuedot.app/sso/connections/ssoc_p3k8x2m4q9z1/start" },
};
const domainExample = {
  object: "sso_domain", domain: "acme.com", verified: true, verified_at: 1790801000000,
  txt_record: { type: "TXT", name: "_revenuedot-sso.acme.com", value: "revenuedot-sso-verification=3f9a1c0e7b2d4a6f8e1c3b5a7d9f0e2c" },
  last_checked_at: 1790801000000, last_error: null, created_at: 1790800914012,
};

const samlConfig = obj({
  idp_entity_id: str("The identity provider's entity ID (Issuer)."),
  idp_sso_url: str("The identity provider's sign-in URL for the HTTP-Redirect binding. https on RevenueDot Cloud."),
  idp_certificates: arr(str(), { description: "1 to 5 signing certificates as PEM. Several while the identity provider rotates its certificate." }),
  allow_idp_initiated: bool("Accept sign-ins started from the identity provider's app dashboard. Default false."),
  email_attribute: nstr("Attribute that holds the email address. Null: `email`, `mail`, `emailaddress`, Microsoft's emailaddress claim, `urn:oid:0.9.2342.19200300.100.1.3`, else an email-shaped NameID."),
  first_name_attribute: nstr("Attribute for the first name. Null: common names such as `givenname` and `firstname`."),
  last_name_attribute: nstr("Attribute for the last name. Null: common names such as `sn` and `surname`."),
  groups_attribute: nstr("Attribute that lists the person's groups. Null: `groups` or Microsoft's groups claim."),
});
const oidcConfig = obj({
  issuer: str("The issuer URL. RevenueDot reads `<issuer>/.well-known/openid-configuration`."),
  client_id: str("The client ID registered with the identity provider."),
  scopes: arr(str(), { description: "Default `openid email profile`. `openid` is always added." }),
  groups_claim: nstr("The ID token claim that lists the person's groups. Null: groups are not read."),
  has_client_secret: bool("Whether a client secret is stored. The secret itself is never returned."),
});

export const enterpriseSchemas = {
  EnterpriseStatus: enterprise(obj({
    object: { type: "string", const: "enterprise" },
    mode: en(["licensed", "development", "invalid"], "`licensed`: a valid licence key. `development`: `REVENUEDOT_EE_DEV=true`, for development and testing only. `invalid`: a key that failed or expired more than 14 days ago; no feature is on."),
    features: arr(en(["organizations", "custom_roles", "sso", "scim", "data_location", "audit_retention", "compliance_exports"]), { description: "The features that are on." }),
    licensee: nstr("Who the licence is for."),
    expires_at: nms("When the licence expires. Features keep working for 14 days after it."),
    message: nstr("Why the licence is invalid, or a renewal warning."),
  }, ["object", "mode", "features"])),
  Organization: enterprise(obj({
    object: { type: "string", const: "organization" }, id: str("Organization id (org_...)."), name: str(),
    your_role: en(ORG_ROLES, "Your role in the organization."),
    region: en(REGIONS, "Default data location for the organization's projects."), region_name: str("United States or European Union."),
    selectable_regions: arr(en(REGIONS), { description: "Regions this server accepts. A self-hosted server accepts both. A deployment that enforces regions accepts only its own." }),
    region_enforced: bool("True when this deployment refuses requests for projects stored in another region."),
    audit_retention_days: nint("Days audit log rows are kept (30 to 3650). Null keeps them forever."),
    sso_enforced: bool("Whether people on the organization's verified domains must sign in with single sign-on."),
    seats: obj({ purchased: nint("Seats bought. Recorded, not enforced."), used: int("People who are active members or members of one of the organization's projects.") }),
    billing_email: nstr(), member_count: int("Active members."), project_count: int(),
    features: arr(str(), { description: "The enterprise features this server's licence turns on." }),
    created_at: ms("Creation time."), updated_at: ms("Last change."),
  }, ["object", "id", "name", "your_role", "region"])),
  OrganizationMember: enterprise(obj({
    object: { type: "string", const: "organization_member" }, user_id: str(), email: str(), name: nstr(),
    role: en(ORG_ROLES),
    source: en(["manual", "sso", "scim", "project"], "How the person joined: added by hand, first sign-in with SSO, SCIM, or through a project of the organization."),
    active: bool("False after SCIM deprovisioning."),
    sso_groups: arr(str(), { description: "The groups the identity provider sent at the last SSO sign-in." }),
    last_sso_at: nms("The last SSO sign-in."), password_sign_in: bool("Whether the account has a password."), created_at: ms("When the person joined."),
  }, ["object", "user_id", "email", "role", "source", "active"])),
  OrganizationProject: enterprise(obj({
    object: { type: "string", const: "organization_project" }, id: str("Project id."), name: str(), region: en(REGIONS), region_name: str(),
    member_count: int("Project members."), your_role: nstr("Your role in the project, or null."), added_at: ms("When the project joined the organization."),
  }, ["object", "id", "name", "region"])),
  OrganizationProjectMember: enterprise(obj({
    object: { type: "string", const: "project_member" }, user_id: str(), email: str(), name: nstr(),
    role: str("`admin`, `developer`, `viewer` or a custom role id (role_...)."), role_name: str("Admin, Developer, Viewer, the custom role's name, or \"No access (role removed)\"."),
    source: en(["manual", "org", "idp"], "`org`: an organization owner or admin. `idp`: a group role mapping. `manual`: set by hand; provisioning leaves it alone."),
  }, ["object", "user_id", "role", "role_name"])),
  CustomRole: enterprise(obj({
    object: { type: "string", const: "custom_role" }, id: str("Role id (role_...)."), name: str("Unique in the organization."), description: nstr(),
    scopes: arr(str(), { description: "API v2 scopes from `GET /v2/organizations/{org_id}/scopes`, sorted." }),
    project_id: nstr("The one project the role is for. Null: every project of the organization."),
    member_count: int("Project memberships that use the role."), created_at: ms("Creation time."), updated_at: ms("Last change."),
  }, ["object", "id", "name", "scopes"])),
  RoleMapping: enterprise(obj({
    object: { type: "string", const: "role_mapping" }, id: str("Mapping id (map_...)."),
    group: str("Group name, matched without regard to case against SCIM group names and the SSO groups attribute or claim."),
    project_id: str(), project_name: nstr(), role: str("`admin`, `developer`, `viewer` or a custom role id."), role_name: str(), created_at: ms("Creation time."),
  }, ["object", "id", "group", "project_id", "role"])),
  OrganizationAuditLog: enterprise(obj({
    object: { type: "string", const: "organization_audit_log" }, id: str(), action: str("For example `member_added`, `sso_sign_in`, `scim_user_deactivated`, `audit_logs_purged`."),
    actor: obj({ type: en(["user", "scim", "sso", "system"]), id: nstr("User id, SCIM token id or SSO connection id."), email: nstr("The user's email.") }),
    target: obj({ type: str(), id: nstr() }), data: { type: "object", description: "Details. Never secrets or SAML assertions." }, occurred_at: ms("When it happened."),
  }, ["object", "id", "action", "actor", "target", "occurred_at"])),
  SsoConnection: enterprise(obj({
    object: { type: "string", const: "sso_connection" }, id: str("Connection id (ssoc_...)."), org_id: str(), kind: en(["saml", "oidc"]), name: str(),
    enabled: bool("Sign-ins work only when true. New connections start off."), jit: bool("Create accounts and organization memberships at first sign-in. Default true."),
    saml: samlConfig, oidc: oidcConfig,
    sp: obj({
      entity_id: str("SAML: the entity ID (audience) to enter in the identity provider."), acs_url: str("SAML: the assertion consumer service URL."),
      metadata_url: str("SAML: RevenueDot's service provider metadata."), redirect_uri: str("OpenID Connect: the redirect URI to register."),
      start_url: str("A link that starts a sign-in with this connection."),
    }, ["start_url"], { description: "The values to enter in the identity provider, built from `REVENUEDOT_PUBLIC_URL` or the request's address." }),
    created_at: ms("Creation time."), updated_at: ms("Last change."),
  }, ["object", "id", "org_id", "kind", "name", "enabled", "jit", "sp"])),
  SsoDomain: enterprise(obj({
    object: { type: "string", const: "sso_domain" }, domain: str(), verified: bool(), verified_at: nms("When the TXT record was first found."),
    txt_record: obj({ type: { type: "string", const: "TXT" }, name: str("`_revenuedot-sso.<domain>`"), value: str("`revenuedot-sso-verification=<token>`") }),
    last_checked_at: nms("The last check."), last_error: nstr("Why the last check failed."), created_at: ms("When it was added."),
  }, ["object", "domain", "verified", "txt_record"])),
  ScimToken: enterprise(obj({
    object: { type: "string", const: "scim_token" }, id: str("Token id (sct_...)."), name: str(), prefix: str("The first 13 characters, to tell tokens apart."),
    created_by: str("User id."), created_at: ms("Creation time."), last_used_at: nms("Last request, to the minute."), revoked_at: nms("When it was revoked."),
  }, ["object", "id", "name", "prefix"])),
  ScimUser: enterprise(obj({
    schemas: arr(str()), id: str("SCIM user id (scu_...)."), externalId: str("The identity provider's id."), userName: str("Unique in the organization, without regard to case."),
    name: obj({ formatted: str(), givenName: str(), familyName: str() }), displayName: str(),
    emails: arr(obj({ value: str(), type: str(), primary: bool() }), { description: "The primary address (else the work address, else the first) is the account's email. It must be on a verified domain." }),
    active: bool("False deprovisions the person."),
    groups: arr(obj({ value: str("SCIM group id."), display: str() }), { description: "Read only." }),
    meta: obj({ resourceType: str(), created: str(), lastModified: str(), location: str(), version: str("Weak ETag such as `W/\"3\"`.") }),
  }, ["schemas", "id", "userName", "active"], { additionalProperties: true, description: "A SCIM 2.0 User (RFC 7643). Other attributes you send, such as `phoneNumbers` and the enterprise extension, are stored and returned." })),
  ScimGroup: enterprise(obj({
    schemas: arr(str()), id: str("SCIM group id (scg_...)."), externalId: str(), displayName: str("Unique in the organization. Role mappings match it."),
    members: arr(obj({ value: str("SCIM user id."), display: str(), type: str() })),
    meta: obj({ resourceType: str(), created: str(), lastModified: str(), location: str(), version: str() }),
  }, ["schemas", "id", "displayName"], { description: "A SCIM 2.0 Group. Members are SCIM Users of the organization; nested groups are refused." })),
  ScimListResponse: enterprise(obj({
    schemas: arr(str()), totalResults: int(), startIndex: int("1-based."), itemsPerPage: int(), Resources: arr({ type: "object" }),
  }, ["schemas", "totalResults", "startIndex", "itemsPerPage", "Resources"])),
  ScimError: enterprise(obj({
    schemas: arr(str()), status: str("The HTTP status as a string."),
    scimType: en(["uniqueness", "invalidFilter", "invalidValue", "invalidSyntax", "invalidPath", "noTarget", "mutability", "tooMany"]),
    detail: str("What went wrong."),
  }, ["schemas", "status", "detail"], { description: "RFC 7644 error body, sent as `application/scim+json`." })),
  ScimPatchOp: enterprise(obj({
    schemas: arr(str(), { description: "Must contain `urn:ietf:params:scim:api:messages:2.0:PatchOp`." }),
    Operations: arr(obj({ op: str("add, replace or remove; any case."), path: str("Optional for add and replace. Value filters such as `emails[type eq \"work\"].value` work."), value: {} }, ["op"]), { minItems: 1, maxItems: 1000 }),
  }, ["schemas", "Operations"])),
};

// ---- Status ---------------------------------------------------------------------------------------------------------
const statusPaths = {
  "/v2/enterprise": {
    get: ee({ id: "getEnterpriseStatus", tag: "Enterprise", summary: "Licence state and features", source: SRC.index,
      description: "Any signed-in user. The route exists only when the server was started with `REVENUEDOT_LICENSE_KEY` or `REVENUEDOT_EE_DEV=true`; the open-source build answers 404. With an invalid key it still answers, with `mode: invalid` and no features, and no other enterprise route exists.",
      responses: { 200: ok("The licence state.", ref("EnterpriseStatus"), { object: "enterprise", mode: "development", features: ["organizations", "custom_roles", "sso", "scim", "data_location", "audit_retention", "compliance_exports"], licensee: null, expires_at: null, message: "Development mode: for development and testing only, not for production (ee/LICENSE)." }), ...v2Errors(401) } }),
  },
};

// ---- Organizations ---------------------------------------------------------------------------------------------------
const orgPaths = {
  "/v2/organizations": {
    get: ee({ id: "listOrganizations", tag: "Organizations", summary: "Organizations you belong to", source: SRC.orgs,
      responses: { 200: list(ref("Organization"), "Every organization where you are an active member, oldest first.", { object: "list", items: [orgExample], next_page: null, url: "/v2/organizations" }), ...E() } }),
    post: ee({ id: "createOrganization", tag: "Organizations", summary: "Create an organization", source: SRC.orgs,
      description: "You become its owner. `region` defaults to this deployment's region. A licence with an organization limit answers 403 once the server has that many organizations.",
      requestBody: json(obj({ name: str(undefined, { minLength: 1, maxLength: 100 }), region: en(REGIONS) }, ["name"]), "", { name: "Acme Inc." }),
      responses: { 201: ok("The new organization.", ref("Organization"), orgExample), ...E(400) } }),
  },
  [O]: {
    get: ee({ id: "getOrganization", tag: "Organizations", summary: "Get an organization", source: SRC.orgs, parameters: [org], description: MEMBER,
      responses: { 200: ok("The organization.", ref("Organization"), orgExample), ...E(404) } }),
    post: ee({ id: "updateOrganization", tag: "Organizations", summary: "Update an organization", source: SRC.orgs, parameters: [org],
      description: `${ADMIN} Changing \`audit_retention_days\`, \`seats\` or \`billing_email\` needs an owner. \`sso_enforced: true\` needs an enabled SSO connection and a verified domain (422 otherwise). \`region\` must be one of \`selectable_regions\`. Each field needs its feature in the licence (403 otherwise). Changes are recorded in the organization audit log as \`organization_updated\`.`,
      requestBody: json(obj({
        name: str(undefined, { maxLength: 100 }), region: en(REGIONS, "Default data location for projects."),
        audit_retention_days: nint("30 to 3650. Null keeps audit logs forever.", { minimum: 30, maximum: 3650 }),
        sso_enforced: bool("Require single sign-on for the organization's verified domains."),
        seats: nint("Seats bought, 1 to 100000.", { minimum: 1, maximum: 100000 }), billing_email: nstr(),
      }), "", { audit_retention_days: 365, sso_enforced: true }),
      responses: { 200: ok("The updated organization.", ref("Organization"), orgExample), ...E(400, 404, 422) } }),
    delete: ee({ id: "deleteOrganization", tag: "Organizations", summary: "Delete an organization", source: SRC.orgs, parameters: [org],
      description: `${OWNER} Move every project out first (422 otherwise). Its SSO connections, domains, SCIM tokens, custom roles, mappings and organization audit log are deleted.`,
      responses: { 200: ok("Deleted.", obj({ object: str(), id: str(), deleted_at: ms("When it was deleted.") }), { object: "organization", id: "org_k2m9q4x7z1a8", deleted_at: 1790887314012 }), ...E(404, 422) } }),
  },
  [`${O}/overview`]: {
    get: ee({ id: "getOrganizationOverview", tag: "Organizations", summary: "Organization with SSO and SCIM counts", source: SRC.orgs, parameters: [org], description: MEMBER,
      responses: { 200: ok("The organization plus counts.", { allOf: [ref("Organization"), obj({
        sso: obj({ connections: int(), enabled: int(), verified_domains: arr(str()) }), scim: obj({ active_tokens: int() }),
      })] }), ...E(404) } }),
  },
  [`${O}/members`]: {
    get: ee({ id: "listOrganizationMembers", tag: "Organizations", summary: "List members", source: SRC.orgs, parameters: [org], description: `${MEMBER} Includes deactivated members (\`active: false\`).`,
      responses: { 200: list(ref("OrganizationMember"), "Members, oldest first."), ...E(404) } }),
    post: ee({ id: "addOrganizationMember", tag: "Organizations", summary: "Add an existing account", source: SRC.orgs, parameters: [org],
      description: `${ADMIN} Only owners add owners. The address must already have a RevenueDot account (404 otherwise); new people join through single sign-on, SCIM or a project invite. Owners and admins become Admins of every organization project; group role mappings apply at once.`,
      requestBody: json(obj({ email: str(), role: en(ORG_ROLES, "Default member.") }, ["email"]), "", { email: "sam@acme.com", role: "admin" }),
      responses: { 201: ok("The member.", ref("OrganizationMember")), ...E(400, 404, 409) } }),
  },
  [`${O}/members/{user_id}`]: {
    post: ee({ id: "changeOrganizationRole", tag: "Organizations", summary: "Change a member's organization role", source: SRC.orgs, parameters: [org, path("user_id", "User id.")],
      description: `${ADMIN} Only owners make or unmake owners, and the last owner cannot be demoted (400). Promoting to admin or owner adds Admin access to every organization project; demoting removes the access that came from the organization role.`,
      requestBody: json(obj({ role: en(ORG_ROLES) }, ["role"]), "", { role: "member" }),
      responses: { 200: ok("The member.", ref("OrganizationMember")), ...E(400, 404) } }),
    delete: ee({ id: "removeOrganizationMember", tag: "Organizations", summary: "Remove a member, or leave", source: SRC.orgs, parameters: [org, path("user_id", "User id. Your own to leave.")],
      description: "Admins remove members; only owners remove owners; anyone may remove themselves. The last owner cannot leave (422). The person loses every membership in the organization's projects, including ones added by hand.",
      responses: { 200: ok("Removed.", obj({ object: str(), user_id: str(), deleted_at: ms("When it was removed.") })), ...E(404, 422) } }),
  },
  [`${O}/projects`]: {
    get: ee({ id: "listOrganizationProjects", tag: "Organizations", summary: "List the organization's projects", source: SRC.orgs, parameters: [org], description: MEMBER,
      responses: { 200: list(ref("OrganizationProject"), "Projects with their region and member count."), ...E(404) } }),
    post: ee({ id: "addOrganizationProject", tag: "Organizations", summary: "Move a project into the organization", source: SRC.orgs, parameters: [org],
      description: `${ADMIN} You must also be an Admin of the project (403 otherwise). A project belongs to one organization at a time (409). The project is recorded in this deployment's region; no data moves. Everyone on the project becomes an organization member, and organization owners and admins become its Admins.`,
      requestBody: json(obj({ project_id: str() }, ["project_id"]), "", { project_id: "proj18pzzkao" }),
      responses: { 201: ok("The project.", obj({ object: str(), id: str(), name: nstr(), region: en(REGIONS) })), ...E(400, 404, 409) } }),
  },
  [`${O}/projects/{project_id}`]: {
    delete: ee({ id: "removeOrganizationProject", tag: "Organizations", summary: "Move a project out", source: SRC.orgs, parameters: [org, param("ProjectId")],
      description: `${ADMIN} Memberships stay. Members with a custom role become Viewers, because the organization's roles no longer apply there.`,
      responses: { 200: ok("Moved out.", obj({ object: str(), id: str(), deleted_at: ms("When it left.") })), ...E(404) } }),
  },
  [`${O}/projects/{project_id}/region`]: {
    post: ee({ id: "setProjectRegion", tag: "Organizations", summary: "Set a project's data location", source: SRC.orgs, parameters: [org, param("ProjectId")],
      description: `${ADMIN} Needs the \`data_location\` feature. On a deployment that enforces regions, a project stays in the region where its data is (422 with the other region's dashboard address, or "not available yet"); moving stored data is a support job. Elsewhere the region is recorded.`,
      requestBody: json(obj({ region: en(REGIONS) }, ["region"]), "", { region: "eu" }),
      responses: { 200: ok("The project's region.", obj({ object: str(), id: str(), region: en(REGIONS) })), ...E(400, 404, 422) } }),
  },
  [`${O}/audit_logs`]: {
    get: ee({ id: "listOrganizationAuditLogs", tag: "Organizations", summary: "The organization audit log", source: SRC.orgs,
      parameters: [org, { name: "start_time", in: "query", schema: int(), description: "Only entries at or after this time (epoch milliseconds)." }, { name: "end_time", in: "query", schema: int(), description: "Only entries before this time (epoch milliseconds)." }, ...page],
      description: `${ADMIN} Newest first. Project audit logs stay at \`GET /v2/projects/{project_id}/audit_logs\`.`,
      responses: { 200: list(ref("OrganizationAuditLog"), "A page of entries."), ...E(400, 404) } }),
  },
};

// ---- Custom roles and group role mappings -----------------------------------------------------------------------------
const rolePaths = {
  [`${O}/scopes`]: {
    get: ee({ id: "listRoleScopes", tag: "Custom roles", summary: "Scopes a custom role can hold", source: SRC.orgs, parameters: [org], description: MEMBER,
      responses: { 200: ok("33 scopes in 5 groups.", obj({ object: str(), groups: arr(obj({ group: str(), scopes: arr(obj({ scope: str(), label: str() })) })) }),
        { object: "scope_catalogue", groups: [{ group: "Customers", scopes: [{ scope: "customer_information:customers:read", label: "View customers" }] }] }), ...E(404) } }),
  },
  [`${O}/roles`]: {
    get: ee({ id: "listCustomRoles", tag: "Custom roles", summary: "List custom roles", source: SRC.orgs, parameters: [org], description: MEMBER,
      responses: { 200: list(ref("CustomRole"), "Roles, oldest first.", { object: "list", items: [roleExample], next_page: null, url: "/v2/organizations/org_k2m9q4x7z1a8/roles" }), ...E(404) } }),
    post: ee({ id: "createCustomRole", tag: "Custom roles", summary: "Create a custom role", source: SRC.orgs, parameters: [org],
      description: `${ADMIN} Unknown scopes and \`project_configuration:api_keys:read_write\` are refused (400). A name already used in the organization answers 409.`,
      requestBody: json(obj({ name: str(undefined, { maxLength: 100 }), description: nstr(undefined, { maxLength: 500 }), scopes: arr(str(), { maxItems: 200 }), project_id: nstr("Limit the role to one project of the organization.") }, ["name", "scopes"]),
        "", { name: "Support agent", description: "Refunds and customer lookups, no catalog changes.", scopes: ["customer_information:customers:read", "customer_information:purchases:read_write", "customer_information:subscriptions:read_write"] }),
      responses: { 201: ok("The role.", ref("CustomRole"), roleExample), ...E(400, 404, 409) } }),
  },
  [`${O}/roles/{role_id}`]: {
    get: ee({ id: "getCustomRole", tag: "Custom roles", summary: "Get a custom role", source: SRC.orgs, parameters: [org, path("role_id", "Role id (role_...).")], description: MEMBER,
      responses: { 200: ok("The role.", ref("CustomRole"), roleExample), ...E(404) } }),
    post: ee({ id: "updateCustomRole", tag: "Custom roles", summary: "Update a custom role", source: SRC.orgs, parameters: [org, path("role_id", "Role id (role_...).")],
      description: `${ADMIN} New scopes apply to everyone with the role on their next request. A role in use cannot change its project (400).`,
      requestBody: json(obj({ name: str(), description: nstr(), scopes: arr(str()), project_id: nstr() }), "", { scopes: ["customer_information:customers:read", "customer_information:purchases:read"] }),
      responses: { 200: ok("The role.", ref("CustomRole"), roleExample), ...E(400, 404, 409) } }),
    delete: ee({ id: "deleteCustomRole", tag: "Custom roles", summary: "Delete a custom role", source: SRC.orgs, parameters: [org, path("role_id", "Role id (role_...).")],
      description: `${ADMIN} Everyone with the role becomes a Viewer, and group role mappings that gave it are deleted.`,
      responses: { 200: ok("Deleted.", obj({ object: str(), id: str(), deleted_at: ms("When it was deleted.") })), ...E(404) } }),
  },
  [`${O}/projects/{project_id}/members`]: {
    get: ee({ id: "listOrganizationProjectMembers", tag: "Custom roles", summary: "A project's members with role names", source: SRC.orgs, parameters: [org, param("ProjectId")], description: MEMBER,
      responses: { 200: list(ref("OrganizationProjectMember"), "The project's members."), ...E(404) } }),
  },
  [`${O}/projects/{project_id}/members/{user_id}`]: {
    post: ee({ id: "setProjectMemberRole", tag: "Custom roles", summary: "Give a project member a built-in or custom role", source: SRC.orgs, parameters: [org, param("ProjectId"), path("user_id", "User id.")],
      description: "Organization admins, or Admins of the project. The person must already be a member of the project (404). The role must be `admin`, `developer`, `viewer`, or a custom role of the organization for every project or for this one (400). The last Admin and the project owner stay Admins. A role set here is never changed by group role mappings.",
      requestBody: json(obj({ role: str("`admin`, `developer`, `viewer` or a custom role id.") }, ["role"]), "", { role: "role_8f2kq0x1m3zv" }),
      responses: { 200: ok("The membership.", obj({ object: str(), user_id: str(), project_id: str(), role: str(), role_name: str() }), { object: "project_member", user_id: "usr_8f2kq0x1m3zv7a2b", project_id: "proj18pzzkao", role: "role_8f2kq0x1m3zv", role_name: "Support agent" }), ...E(400, 404, 422) } }),
  },
  [`${O}/role_mappings`]: {
    get: ee({ id: "listRoleMappings", tag: "Custom roles", summary: "List group role mappings", source: SRC.orgs, parameters: [org], description: MEMBER,
      responses: { 200: list(ref("RoleMapping"), "Mappings by group.", { object: "list", items: [mappingExample], next_page: null, url: "/v2/organizations/org_k2m9q4x7z1a8/role_mappings" }), ...E(404) } }),
    post: ee({ id: "saveRoleMapping", tag: "Custom roles", summary: "Map a group to a role in a project", source: SRC.orgs, parameters: [org],
      description: `${ADMIN} One mapping per group and project: saving the same pair again replaces its role (200). Every member's access is re-applied at once; \`memberships_changed\` counts the changes.`,
      requestBody: json(obj({ group: str(undefined, { maxLength: 256 }), project_id: str(), role: str("`admin`, `developer`, `viewer` or a custom role id.") }, ["group", "project_id", "role"]), "", { group: "RevenueDot Support", project_id: "proj18pzzkao", role: "role_8f2kq0x1m3zv" }),
      responses: {
        201: ok("Created.", { allOf: [ref("RoleMapping"), obj({ memberships_changed: int() })] }, { ...mappingExample, memberships_changed: 4 }),
        200: ok("Replaced.", { allOf: [ref("RoleMapping"), obj({ memberships_changed: int() })] }), ...E(400, 404) } }),
  },
  [`${O}/role_mappings/{mapping_id}`]: {
    delete: ee({ id: "deleteRoleMapping", tag: "Custom roles", summary: "Delete a group role mapping", source: SRC.orgs, parameters: [org, path("mapping_id", "Mapping id (map_...).")],
      description: `${ADMIN} Memberships that the mapping created are removed or lowered at once.`,
      responses: { 200: ok("Deleted.", obj({ object: str(), id: str(), deleted_at: ms("When it was deleted."), memberships_changed: int() })), ...E(404) } }),
  },
};

// ---- Compliance exports ---------------------------------------------------------------------------------------------
const exportHeaders = {
  "X-RevenueDot-Signature": { schema: str(), description: "`ed25519=<base64 signature>` over the exact response bytes. Missing when the server has no signing key." },
  "X-RevenueDot-Key-Id": { schema: str(), description: "First 16 hex characters of the SHA-256 of the public key." },
  "X-RevenueDot-Content-SHA256": { schema: str(), description: "Hex SHA-256 of the response bytes." },
};
const exportPaths = {
  [`${O}/exports/public_key`]: {
    get: ee({ id: "getExportSigningKey", tag: "Compliance exports", summary: "The public key exports are signed with", source: SRC.exports, parameters: [org], description: ADMIN,
      responses: { 200: ok("The key.", obj({ object: str(), algorithm: { type: "string", const: "Ed25519" }, public_key: nstr("Raw 32-byte Ed25519 public key, base64. Null when the server cannot sign."), key_id: nstr(), signs: bool("False when the server has neither `REVENUEDOT_SIGNING_KEY` nor `REVENUEDOT_ENCRYPTION_KEY`.") }),
        { object: "export_signing_key", algorithm: "Ed25519", public_key: "kQ3s0x8b1m5Zt2Wq7yJcVhE9nR4uLpA6fG0dK3oT1sY=", key_id: "4be1c0f29a7d3e58", signs: true }), ...E(404) } }),
  },
  [`${O}/exports/{kind}`]: {
    get: ee({ id: "downloadComplianceExport", tag: "Compliance exports", summary: "Download a signed audit log or access review", source: SRC.exports,
      parameters: [org, { name: "kind", in: "path", required: true, schema: en(["audit_logs", "access_review"]), description: "`audit_logs`: the organization log and its projects' logs, oldest first. `access_review`: one row per person per organization project, plus members without project access." },
        { name: "format", in: "query", schema: en(["csv", "json"]), description: "Default csv." },
        { name: "start_time", in: "query", schema: int(), description: "Audit logs only: entries at or after this time (epoch milliseconds)." },
        { name: "end_time", in: "query", schema: int(), description: "Audit logs only: entries before this time (epoch milliseconds)." }],
      description: `${ADMIN} At most 200,000 rows per file; more answers 400, so choose a shorter date range. CSV cells that start with \`=\`, \`+\`, \`-\`, \`@\`, a tab or a carriage return get a leading apostrophe. Each download is recorded in the organization audit log as \`compliance_export_created\` with its SHA-256.`,
      responses: {
        200: { description: "The file, as an attachment.", headers: exportHeaders, content: { "text/csv": { schema: str() }, "application/json": { schema: obj({ object: str(), kind: str(), organization: obj({ id: str(), name: str() }), generated_at: str(), generated_by: str(), start_time: nstr(), end_time: nstr(), row_count: int(), columns: arr(str()), rows: arr({ type: "object" }) }) } } },
        ...E(400, 404) } }),
  },
};

// ---- Single sign-on -------------------------------------------------------------------------------------------------
const C = `${O}/sso/connections`;
const conn = path("connection_id", "Connection id (ssoc_...).");
const samlBody = obj({
  metadata_xml: str("The identity provider's metadata XML. Fills the entity ID, the HTTP-Redirect sign-in URL and the signing certificates."),
  idp_entity_id: str(), idp_sso_url: str(), idp_certificates: arr(str(), { minItems: 1, maxItems: 5 }), allow_idp_initiated: bool(),
  email_attribute: nstr(), first_name_attribute: nstr(), last_name_attribute: nstr(), groups_attribute: nstr(),
});
const oidcBody = obj({ issuer: str(), client_id: str(), client_secret: nstr("Stored encrypted, never returned. Null removes it."), scopes: arr(str()), groups_claim: nstr() });
const D = `${O}/sso/domains`;
const domainParam = path("domain", "The domain, such as acme.com.");
const redirect = (description) => ({ description, headers: { Location: { schema: str(), description: "Where the browser goes next." } } });
const SSO_FAIL = "Failures redirect to `/login?sso_error=<code>`, one of `failed`, `connection_off`, `rate_limited`, `not_set_up`, `domain_not_verified`, `access_removed`, `not_a_member`, `other_browser` or `idp_error`; the sign-in page shows the message for the code, and the exact reason goes to the organization audit log as `sso_sign_in_failed`.";
const ssoPaths = {
  [C]: {
    get: ee({ id: "listSsoConnections", tag: "Single sign-on", summary: "List SSO connections", source: SRC.sso, parameters: [org], description: ADMIN,
      responses: { 200: list(ref("SsoConnection"), "Connections, oldest first."), ...E(404) } }),
    post: ee({ id: "createSsoConnection", tag: "Single sign-on", summary: "Create a SAML or OpenID Connect connection", source: SRC.sso, parameters: [org],
      description: `${ADMIN} Send \`saml\` for a SAML connection or \`oidc\` for OpenID Connect. A connection starts turned off unless \`enabled\` is true. The answer's \`sp\` holds the values to enter in the identity provider.`,
      requestBody: json(obj({ kind: en(["saml", "oidc"]), name: str(undefined, { maxLength: 100 }), enabled: bool(), jit: bool("Default true."), saml: samlBody, oidc: oidcBody }, ["kind", "name"]),
        "", { kind: "oidc", name: "Google Workspace", oidc: { issuer: "https://accounts.google.com", client_id: "1234567890-abc.apps.googleusercontent.com", client_secret: "GOCSPX-..." } }),
      responses: { 201: ok("The connection.", ref("SsoConnection"), samlConnExample), ...E(400, 404) } }),
  },
  [`${C}/{connection_id}`]: {
    get: ee({ id: "getSsoConnection", tag: "Single sign-on", summary: "Get an SSO connection", source: SRC.sso, parameters: [org, conn], description: ADMIN,
      responses: { 200: ok("The connection.", ref("SsoConnection"), samlConnExample), ...E(404) } }),
    post: ee({ id: "updateSsoConnection", tag: "Single sign-on", summary: "Update an SSO connection", source: SRC.sso, parameters: [org, conn],
      description: `${ADMIN} Fields you leave out keep their value. An organization that requires SSO cannot turn off its last enabled connection (422).`,
      requestBody: json(obj({ name: str(), enabled: bool(), jit: bool(), saml: samlBody, oidc: oidcBody }), "", { enabled: true }),
      responses: { 200: ok("The connection.", ref("SsoConnection"), samlConnExample), ...E(400, 404, 422) } }),
    delete: ee({ id: "deleteSsoConnection", tag: "Single sign-on", summary: "Delete an SSO connection", source: SRC.sso, parameters: [org, conn],
      description: `${ADMIN} An organization that requires SSO cannot delete its last enabled connection (422).`,
      responses: { 200: ok("Deleted.", obj({ object: str(), id: str(), deleted: bool() })), ...E(404, 422) } }),
  },
  [D]: {
    get: ee({ id: "listSsoDomains", tag: "Single sign-on", summary: "List email domains", source: SRC.domains, parameters: [org], description: ADMIN,
      responses: { 200: list(ref("SsoDomain"), "Domains, oldest first."), ...E(404) } }),
    post: ee({ id: "addSsoDomain", tag: "Single sign-on", summary: "Add an email domain", source: SRC.domains, parameters: [org],
      description: `${ADMIN} Answers the TXT record to publish. Public mail providers such as gmail.com are refused (400). A domain another organization verified answers 409; an unverified claim by another organization does not block you. Adding a domain you already have answers 200.`,
      requestBody: json(obj({ domain: str(undefined, { maxLength: 253 }) }, ["domain"]), "", { domain: "acme.com" }),
      responses: { 201: ok("The domain, not verified yet.", ref("SsoDomain"), { ...domainExample, verified: false, verified_at: null, last_checked_at: null }), 200: ok("Already added.", ref("SsoDomain")), ...E(400, 404, 409) } }),
  },
  [`${D}/{domain}/actions/verify`]: {
    post: ee({ id: "verifySsoDomain", tag: "Single sign-on", summary: "Check the domain's TXT record", source: SRC.domains, parameters: [org, domainParam],
      description: `${ADMIN} Looks up \`_revenuedot-sso.<domain>\` with DNS over HTTPS (Cloudflare's resolver). At most 10 checks a minute per organization (429). A verified domain stays verified if a later check fails.`,
      responses: { 200: ok("The domain, with the TXT values found.", { allOf: [ref("SsoDomain"), obj({ found: obj({ txt: arr(str()) }) })] }, { ...domainExample, found: { txt: ["revenuedot-sso-verification=3f9a1c0e7b2d4a6f8e1c3b5a7d9f0e2c"] } }), ...E(404, 429) } }),
  },
  [`${D}/{domain}`]: {
    delete: ee({ id: "deleteSsoDomain", tag: "Single sign-on", summary: "Remove an email domain", source: SRC.domains, parameters: [org, domainParam], description: ADMIN,
      responses: { 200: ok("Removed.", obj({ object: str(), domain: str(), deleted: bool() })), ...E(404) } }),
  },
  "/sso/lookup": {
    post: op({ id: "ssoLookup", tag: "Single sign-on", summary: "Does this address sign in with SSO?", security: NONE, source: SRC.sso, extension: true,
      description: "No session. True when the address is on a domain an organization verified and that organization has an enabled connection.",
      requestBody: json(obj({ email: str(), next: str("A path on this site to open after sign-in.") }, ["email"]), "", { email: "sam@acme.com" }),
      responses: { 200: ok("The answer.", obj({ sso: bool(), url: str("`/sso/start?email=...`, only when `sso` is true.") }), { sso: true, url: "/sso/start?email=sam%40acme.com" }) } }),
  },
  "/sso/start": {
    get: op({ id: "ssoStart", tag: "Single sign-on", summary: "Start a sign-in for an email address", security: NONE, source: SRC.sso, extension: true,
      parameters: [{ name: "email", in: "query", required: true, schema: str(), description: "The work email address." }, { name: "next", in: "query", schema: str(), description: "A path on this site to open after sign-in. Anything else becomes `/`." }],
      description: `Opens in the browser. Finds the organization that verified the address's domain and sends the browser to its first enabled connection (oldest first). At most 30 starts a minute per IP address. ${SSO_FAIL}`,
      responses: { 303: redirect("To the identity provider, or to `/login?sso_error=...`.") } }),
  },
  "/sso/connections/{id}/start": {
    get: op({ id: "ssoConnectionStart", tag: "Single sign-on", summary: "Start a sign-in with one connection", security: NONE, source: SRC.sso, extension: true,
      parameters: [path("id", "Connection id (ssoc_...)."), { name: "next", in: "query", schema: str(), description: "A path on this site to open after sign-in." }],
      description: `The \`start_url\` of a connection. ${SSO_FAIL}`,
      responses: { 303: redirect("To the identity provider, or to `/login?sso_error=...`.") } }),
  },
  "/sso/saml/{id}/metadata": {
    get: op({ id: "samlMetadata", tag: "Single sign-on", summary: "SAML service provider metadata", security: NONE, source: SRC.sso, extension: true, parameters: [path("id", "Connection id (ssoc_...).")],
      description: "This URL is also the connection's entity ID.",
      responses: { 200: { description: "The metadata.", content: { "application/samlmetadata+xml": { schema: str() } } }, 404: { description: "No SAML connection with this id." } } }),
  },
  "/sso/saml/{id}/acs": {
    post: op({ id: "samlAcs", tag: "Single sign-on", summary: "SAML assertion consumer service", security: NONE, source: SRC.sso, extension: true, parameters: [path("id", "Connection id (ssoc_...).")],
      description: `The identity provider posts the SAML response here (HTTP-POST binding). RevenueDot checks the assertion's signature, audience, recipient, destination, issuer, validity times (60 seconds of leeway) and that the answer belongs to a sign-in this browser started; each assertion is accepted once. Responses without an InResponseTo are IdP-initiated and are refused unless the connection allows them. On success it sets the session cookie. ${SSO_FAIL}`,
      requestBody: { required: true, content: { "application/x-www-form-urlencoded": { schema: obj({ SAMLResponse: str("Base64 SAML response."), RelayState: str("For IdP-initiated sign-in: a path to open after sign-in.") }, ["SAMLResponse"]) } } },
      responses: { 303: redirect("To the page the person started from, or to `/login?sso_error=...`.") } }),
  },
  "/sso/oidc/{id}/callback": {
    get: op({ id: "oidcCallback", tag: "Single sign-on", summary: "OpenID Connect redirect URI", security: NONE, source: SRC.sso, extension: true,
      parameters: [path("id", "Connection id (ssoc_...)."), { name: "state", in: "query", schema: str() }, { name: "code", in: "query", schema: str() }, { name: "error", in: "query", schema: str() }],
      description: `The identity provider sends the browser back here. RevenueDot checks the state against the browser that started the sign-in, exchanges the code with PKCE, and verifies the ID token (issuer, audience, expiry, nonce, \`azp\`). The token must have an \`email\` claim, and \`email_verified\` must not be false. ${SSO_FAIL}`,
      responses: { 303: redirect("To the page the person started from, or to `/login?sso_error=...`.") } }),
  },
};

// ---- SCIM 2.0 -------------------------------------------------------------------------------------------------------
const SCIM_TYPE = "application/scim+json";
const SCIM = [{ scimToken: [] }];
const scimJson = (schema, example) => ({ content: { [SCIM_TYPE]: { schema, ...(example !== undefined ? { example } : {}) } } });
const scimOk = (description, schema, example, headers) => ({ description, ...(headers ? { headers } : {}), ...scimJson(schema, example) });
const scimErr = (status, detail, scimType) => ({ description: { 400: "The request, filter or PATCH is invalid.", 401: "No token, or a revoked or unknown one.", 404: "Not found in the token's organization.", 409: "The userName, email or group name is taken.", 412: "If-Match does not match the current version.", 413: "The body is larger than 1 MB." }[status],
  ...scimJson(ref("ScimError"), { schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], status: String(status), ...(scimType ? { scimType } : {}), detail }) });
const SE = {
  400: scimErr(400, "sam@gmail.com is not on a domain this organization verified. Verify the domain in the RevenueDot dashboard (Organization settings, Single sign-on) first.", "invalidValue"),
  401: scimErr(401, "This SCIM token is not valid or was revoked."), 404: scimErr(404, "User not found."),
  409: scimErr(409, "A user with userName \"sam@acme.com\" already exists in this organization.", "uniqueness"),
  412: scimErr(412, "The resource changed: its current version is W/\"4\"."), 413: scimErr(413, "The request body is larger than 1 MB."),
};
const scimErrs = (...codes) => Object.fromEntries(codes.map((c) => [String(c), SE[c]]));
const scim = (o) => op({ security: SCIM, extension: true, source: SRC.scim, tag: "SCIM 2.0", ...o });
const scimId = path("id", "The SCIM id.");
const etag = { ETag: { schema: str(), description: "Weak ETag, such as `W/\"3\"`." } };
const ifMatch = { name: "If-Match", in: "header", schema: str(), description: "Optional. The ETag you read; a changed resource answers 412." };
const ifNoneMatch = { name: "If-None-Match", in: "header", schema: str(), description: "Optional. Answers 304 when the ETag still matches." };
const listQuery = [
  { name: "filter", in: "query", schema: str(), description: "RFC 7644 filter: `eq ne co sw ew pr gt ge lt le`, `and`, `or`, `not`, parentheses and value paths such as `emails[type eq \"work\"].value`." },
  { name: "startIndex", in: "query", schema: int(undefined, { minimum: 1, default: 1 }), description: "1-based." },
  { name: "count", in: "query", schema: int(undefined, { minimum: 0, maximum: 200, default: 100 }), description: "Page size, at most 200." },
  { name: "attributes", in: "query", schema: str(), description: "Comma-separated attributes to return." },
  { name: "excludedAttributes", in: "query", schema: str(), description: "Comma-separated attributes to leave out (`members` on Groups is common)." },
];
const projection = listQuery.slice(3);
const scimUserExample = {
  schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"], id: "scu_9x2k4m8q1z7a3b5c", externalId: "00u1a2b3c4d5", userName: "sam@acme.com",
  name: { givenName: "Sam", familyName: "Lee" }, emails: [{ value: "sam@acme.com", type: "work", primary: true }], active: true,
  groups: [{ value: "scg_4k8m2q9x1z7a3b5c", display: "RevenueDot Support" }],
  meta: { resourceType: "User", created: "2026-10-01T09:12:00.000Z", lastModified: "2026-10-01T09:12:00.000Z", location: "https://app.revenuedot.app/scim/v2/Users/scu_9x2k4m8q1z7a3b5c", version: "W/\"1\"" },
};
const scimGroupExample = {
  schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"], id: "scg_4k8m2q9x1z7a3b5c", displayName: "RevenueDot Support",
  members: [{ value: "scu_9x2k4m8q1z7a3b5c", display: "Sam Lee", type: "User" }],
  meta: { resourceType: "Group", created: "2026-10-01T09:12:00.000Z", lastModified: "2026-10-01T09:12:00.000Z", location: "https://app.revenuedot.app/scim/v2/Groups/scg_4k8m2q9x1z7a3b5c", version: "W/\"1\"" },
};
// Request bodies: the same shapes without the server-owned id (and, for Users, without groups).
const { "x-revenuedot-enterprise": _u, ...userShape } = enterpriseSchemas.ScimUser;
const { "x-revenuedot-enterprise": _g, ...groupShape } = enterpriseSchemas.ScimGroup;
const userInput = { ...userShape, required: ["userName"], description: "A SCIM 2.0 User. `id`, `meta`, `groups` and `password` are ignored." };
const groupInput = { ...groupShape, required: ["displayName"], description: "A SCIM 2.0 Group. `id` and `meta` are ignored." };
const userBody = { required: true, ...scimJson(userInput, { schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"], userName: "sam@acme.com", name: { givenName: "Sam", familyName: "Lee" }, emails: [{ value: "sam@acme.com", type: "work", primary: true }], active: true }) };
const groupBody = { required: true, ...scimJson(groupInput, { schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"], displayName: "RevenueDot Support", members: [{ value: "scu_9x2k4m8q1z7a3b5c" }] }) };
const patchBody = (example) => ({ required: true, ...scimJson(ref("ScimPatchOp"), example) });
const T = `${O}/scim`;
const scimPaths = {
  [`${T}/tokens`]: {
    get: ee({ id: "listScimTokens", tag: "SCIM 2.0", summary: "List SCIM tokens", source: SRC.scim, parameters: [org], description: `${ADMIN} Never returns the secret.`,
      responses: { 200: list(ref("ScimToken"), "Tokens, revoked ones included."), ...E(404) } }),
    post: ee({ id: "createScimToken", tag: "SCIM 2.0", summary: "Create a SCIM token", source: SRC.scim, parameters: [org],
      description: `${ADMIN} The answer holds the token (\`rdscim_\` and 64 hex characters) once; RevenueDot stores only its SHA-256. \`base_url\` is the SCIM base URL for the identity provider.`,
      requestBody: json(obj({ name: str(undefined, { maxLength: 100 }) }, ["name"]), "", { name: "Okta" }),
      responses: { 201: ok("The token, shown once.", { allOf: [ref("ScimToken"), obj({ token: str(), base_url: str() })] }, { object: "scim_token", id: "sct_m3k9q2x8z1a4", name: "Okta", prefix: "rdscim_4f8a1c", created_by: "usr_8f2kq0x1m3zv7a2b", created_at: 1790800914012, last_used_at: null, revoked_at: null, token: "rdscim_4f8a1c…", base_url: "https://app.revenuedot.app/scim/v2" }), ...E(400, 404) } }),
  },
  [`${T}/tokens/{token_id}`]: {
    delete: ee({ id: "revokeScimToken", tag: "SCIM 2.0", summary: "Revoke a SCIM token", source: SRC.scim, parameters: [org, path("token_id", "Token id (sct_...).")],
      description: `${ADMIN} Requests with the token answer 401 at once. Revoking twice answers the token again.`,
      responses: { 200: ok("The revoked token.", ref("ScimToken")), ...E(404) } }),
  },
  [`${T}/groups`]: {
    get: ee({ id: "listScimGroupsForMapping", tag: "SCIM 2.0", summary: "Groups the identity provider pushed", source: SRC.scim, parameters: [org],
      description: `${ADMIN} For picking groups in the role mapping editor.`,
      responses: { 200: list(obj({ object: str(), id: str(), display_name: str(), external_id: nstr(), member_count: int(), created_at: ms("Creation time."), updated_at: ms("Last change.") }), "Groups by name."), ...E(404) } }),
  },
  "/scim/v2/ServiceProviderConfig": {
    get: scim({ id: "scimServiceProviderConfig", summary: "Service provider configuration",
      description: "PATCH, filters (at most 200 results) and ETags are supported. Bulk, sorting and password changes are not.",
      responses: { 200: scimOk("RFC 7643 §5.", { type: "object" }), ...scimErrs(401) } }),
  },
  "/scim/v2/ResourceTypes": {
    get: scim({ id: "scimResourceTypes", summary: "Resource types (User, Group)", responses: { 200: scimOk("A ListResponse of User and Group.", ref("ScimListResponse")), ...scimErrs(401) } }),
  },
  "/scim/v2/ResourceTypes/{name}": {
    get: scim({ id: "scimResourceType", summary: "One resource type", parameters: [path("name", "User or Group.")], responses: { 200: scimOk("The resource type.", { type: "object" }), ...scimErrs(401, 404) } }),
  },
  "/scim/v2/Schemas": {
    get: scim({ id: "scimSchemas", summary: "Schemas (User, Group, enterprise User)", responses: { 200: scimOk("A ListResponse of schemas.", ref("ScimListResponse")), ...scimErrs(401) } }),
  },
  "/scim/v2/Schemas/{id}": {
    get: scim({ id: "scimSchema", summary: "One schema", parameters: [path("id", "Schema URN.")], responses: { 200: scimOk("The schema.", { type: "object" }), ...scimErrs(401, 404) } }),
  },
  "/scim/v2/Users": {
    get: scim({ id: "scimListUsers", summary: "List or find users", parameters: listQuery,
      description: "Okta and Entra look a user up with `filter=userName eq \"...\"` before creating them.",
      responses: { 200: scimOk("A ListResponse of Users.", ref("ScimListResponse"), { schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"], totalResults: 1, startIndex: 1, itemsPerPage: 1, Resources: [scimUserExample] }), ...scimErrs(400, 401) } }),
    post: scim({ id: "scimCreateUser", summary: "Create a user", parameters: projection, requestBody: userBody,
      description: "The email (primary, else work, else first address, else an email-shaped userName) must be on a domain the organization verified. An existing RevenueDot account with that address is linked; otherwise an account without a password is created. The person becomes an active organization member and their group role mappings apply. `password` is ignored.",
      responses: { 201: scimOk("The user.", ref("ScimUser"), scimUserExample, { ...etag, Location: { schema: str(), description: "The user's URL." } }), ...scimErrs(400, 401, 409, 413) } }),
  },
  "/scim/v2/Users/{id}": {
    get: scim({ id: "scimGetUser", summary: "Get a user", parameters: [scimId, ifNoneMatch, ...projection],
      responses: { 200: scimOk("The user.", ref("ScimUser"), scimUserExample, etag), 304: { description: "Not modified." }, ...scimErrs(401, 404) } }),
    put: scim({ id: "scimReplaceUser", summary: "Replace a user", parameters: [scimId, ifMatch, ...projection], requestBody: userBody,
      description: "`active: false` deprovisions: the person loses every membership in the organization's projects and every session ends. `active: true` again restores group-mapped access. A new email, or a reactivation, must be on a verified domain. The organization's last owner cannot be deactivated (400).",
      responses: { 200: scimOk("The user.", ref("ScimUser"), scimUserExample, etag), ...scimErrs(400, 401, 404, 409, 412, 413) } }),
    patch: scim({ id: "scimPatchUser", summary: "Change a user", parameters: [scimId, ifMatch, ...projection],
      requestBody: patchBody({ schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"], Operations: [{ op: "replace", path: "active", value: false }] }),
      description: "RFC 7644 PATCH. Also accepts Okta's `replace` without a path and Entra's capitalised `op` values, `\"False\"` strings and dotted keys. Same effects as PUT.",
      responses: { 200: scimOk("The user.", ref("ScimUser"), scimUserExample, etag), ...scimErrs(400, 401, 404, 409, 412, 413) } }),
    delete: scim({ id: "scimDeleteUser", summary: "Delete a user", parameters: [scimId, ifMatch],
      description: "Deprovisions the person like `active: false`, then deletes the SCIM user. The RevenueDot account and its audit history stay.",
      responses: { 204: { description: "Deleted." }, ...scimErrs(400, 401, 404, 412) } }),
  },
  "/scim/v2/Groups": {
    get: scim({ id: "scimListGroups", summary: "List or find groups", parameters: listQuery,
      responses: { 200: scimOk("A ListResponse of Groups.", ref("ScimListResponse"), { schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"], totalResults: 1, startIndex: 1, itemsPerPage: 1, Resources: [scimGroupExample] }), ...scimErrs(400, 401) } }),
    post: scim({ id: "scimCreateGroup", summary: "Create a group", parameters: projection, requestBody: groupBody,
      description: "Members must be SCIM Users of the organization (400 otherwise). Group role mappings with this name apply to the members at once.",
      responses: { 201: scimOk("The group.", ref("ScimGroup"), scimGroupExample, { ...etag, Location: { schema: str(), description: "The group's URL." } }), ...scimErrs(400, 401, 409, 413) } }),
  },
  "/scim/v2/Groups/{id}": {
    get: scim({ id: "scimGetGroup", summary: "Get a group", parameters: [scimId, ifNoneMatch, ...projection],
      responses: { 200: scimOk("The group.", ref("ScimGroup"), scimGroupExample, etag), 304: { description: "Not modified." }, ...scimErrs(401, 404) } }),
    put: scim({ id: "scimReplaceGroup", summary: "Replace a group", parameters: [scimId, ifMatch, ...projection], requestBody: groupBody,
      description: "Replaces the name and the member list. Access is re-applied for everyone who joined or left, and for every member after a rename.",
      responses: { 200: scimOk("The group.", ref("ScimGroup"), scimGroupExample, etag), ...scimErrs(400, 401, 404, 409, 412, 413) } }),
    patch: scim({ id: "scimPatchGroup", summary: "Change a group", parameters: [scimId, ifMatch, ...projection],
      requestBody: patchBody({ schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"], Operations: [{ op: "add", path: "members", value: [{ value: "scu_9x2k4m8q1z7a3b5c" }] }] }),
      description: "Add or remove members (`remove` with `members[value eq \"...\"]`), or rename.",
      responses: { 200: scimOk("The group.", ref("ScimGroup"), scimGroupExample, etag), ...scimErrs(400, 401, 404, 409, 412, 413) } }),
    delete: scim({ id: "scimDeleteGroup", summary: "Delete a group", parameters: [scimId, ifMatch],
      description: "Access that came from the group's role mappings is removed from its former members.",
      responses: { 204: { description: "Deleted." }, ...scimErrs(401, 404, 412) } }),
  },
};

export const enterprisePaths = { ...statusPaths, ...orgPaths, ...rolePaths, ...exportPaths, ...ssoPaths, ...scimPaths };
