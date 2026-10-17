# Uniform Resource Locator (url)

The Uniform Resource Locator(URL) object describes the characteristics of a URL. Defined in [RFC 1738](https://datatracker.ietf.org/doc/html/rfc1738) and by D3FEND [d3f:URL](https://d3fend.mitre.org/dao/artifact/d3f:URL/).

- **Extends**: [Object (object)](object.md)

## Attributes

### `categories`

- **Type**: `string_t`
- **Requirement**: optional

The Website categorization names, as defined by `category_ids` enum values.

### `category_ids`

- **Type**: `integer_t`
- **Requirement**: recommended
- **Sibling**: `categories`

#### Enum values

- `0`: `Unknown` - The Domain/URL category is unknown.
- `1`: `Adult/Mature Content`
- `3`: `Pornography`
- `4`: `Sex Education`
- `5`: `Intimate Apparel/Swimsuit`
- `6`: `Nudity`
- `7`: `Extreme`
- `9`: `Scam/Questionable/Illegal`
- `11`: `Gambling`
- `14`: `Violence/Hate/Racism`
- `15`: `Weapons`
- `16`: `Abortion`
- `17`: `Hacking`
- `18`: `Phishing`
- `20`: `Entertainment`
- `21`: `Business/Economy`
- `22`: `Alternative Spirituality/Belief`
- `23`: `Alcohol`
- `24`: `Tobacco`
- `25`: `Controlled Substances`
- `26`: `Child Pornography`
- `27`: `Education`
- `29`: `Charitable Organizations`
- `30`: `Art/Culture`
- `31`: `Financial Services`
- `32`: `Brokerage/Trading`
- `33`: `Games`
- `34`: `Government/Legal`
- `35`: `Military`
- `36`: `Political/Social Advocacy`
- `37`: `Health`
- `38`: `Technology/Internet`
- `40`: `Search Engines/Portals`
- `43`: `Malicious Sources/Malnets`
- `44`: `Malicious Outbound Data/Botnets`
- `45`: `Job Search/Careers`
- `46`: `News/Media`
- `47`: `Personals/Dating`
- `49`: `Reference`
- `50`: `Mixed Content/Potentially Adult`
- `51`: `Chat (IM)/SMS`
- `52`: `Email`
- `53`: `Newsgroups/Forums`
- `54`: `Religion`
- `55`: `Social Networking`
- `56`: `File Storage/Sharing`
- `57`: `Remote Access Tools`
- `58`: `Shopping`
- `59`: `Auctions`
- `60`: `Real Estate`
- `61`: `Society/Daily Living`
- `63`: `Personal Sites`
- `64`: `Restaurants/Dining/Food`
- `65`: `Sports/Recreation`
- `66`: `Travel`
- `67`: `Vehicles`
- `68`: `Humor/Jokes`
- `71`: `Software Downloads`
- `83`: `Peer-to-Peer (P2P)`
- `84`: `Audio/Video Clips`
- `85`: `Office/Business Applications`
- `86`: `Proxy Avoidance`
- `87`: `For Kids`
- `88`: `Web Ads/Analytics`
- `89`: `Web Hosting`
- `90`: `Uncategorized`
- `92`: `Suspicious`
- `93`: `Sexual Expression`
- `95`: `Translation`
- `96`: `Non-Viewable/Infrastructure`
- `97`: `Content Servers`
- `98`: `Placeholders`
- `99`: `Other` - The Domain/URL category is not mapped. See the `categories` attribute, which contains a data source specific value.
- `101`: `Spam`
- `102`: `Potentially Unwanted Software`
- `103`: `Dynamic DNS Host`
- `106`: `E-Card/Invitations`
- `107`: `Informational`
- `108`: `Computer/Information Security`
- `109`: `Internet Connected Devices`
- `110`: `Internet Telephony`
- `111`: `Online Meetings`
- `112`: `Media Sharing`
- `113`: `Radio/Audio Streams`
- `114`: `TV/Video Streams`
- `118`: `Piracy/Copyright Concerns`
- `121`: `Marijuana`

The Website categorization identifiers.

### `domain`

- **Type**: `string_t`
- **Requirement**: optional

The domain portion of the URL. For example: `example.com` in `https://sub.example.com`.

### `hostname`

- **Type**: `hostname_t`
- **Requirement**: recommended

The URL host as extracted from the URL. For example: `www.example.com` from `www.example.com/download/trouble`.

### `path`

- **Type**: `string_t`
- **Requirement**: recommended

The URL path as extracted from the URL. For example: `/download/trouble` from `www.example.com/download/trouble`.

### `port`

- **Type**: `port_t`
- **Requirement**: recommended

The URL port. For example: `80`.

### `query_string`

- **Type**: `string_t`
- **Requirement**: recommended

The query portion of the URL. For example: the query portion of the URL `http://www.example.com/search?q=bad&sort=date` is `q=bad&sort=date`.

### `resource_type`

- **Type**: `string_t`
- **Requirement**: optional

The context in which a resource was retrieved in a web request.

### `scheme`

- **Type**: `string_t`
- **Requirement**: recommended

The scheme portion of the URL. For example: `http`, `https`, `ftp`, or `sftp`.

### `subdomain`

- **Type**: `string_t`
- **Requirement**: optional

The subdomain portion of the URL. For example: `sub` in `https://sub.example.com` or `sub2.sub1` in `https://sub2.sub1.example.com`.

### `url_string`

- **Type**: `url_t`
- **Requirement**: recommended

The URL string. See RFC 1738. For example: `http://www.example.com/download/trouble.exe`. Note: The URL path should not populate the URL string.
