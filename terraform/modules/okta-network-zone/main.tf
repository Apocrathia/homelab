# -----------------------------------------------------------------------------
# Okta network zones
# -----------------------------------------------------------------------------
# Home egress is dynamic: the IP is probed at plan/apply time (wherever tofu
# runs egresses to the internet; CI runners sit on the lab network). chomp()
# strips the endpoint's trailing newline. Zones stay inert until a sign-in or
# password policy references them.

data "http" "egress_ip" {
  url = var.egress_probe_url
}

locals {
  egress_ip_cidr = "${chomp(data.http.egress_ip.response_body)}/32"
}

resource "okta_network_zone" "this" {
  for_each = var.network_zones

  name               = each.value.name
  type               = each.value.type
  usage              = each.value.usage
  gateways           = each.value.include_egress_ip ? setunion(each.value.gateways, [local.egress_ip_cidr]) : each.value.gateways
  proxies            = each.value.proxies
  dynamic_proxy_type = each.value.dynamic_proxy_type
}
