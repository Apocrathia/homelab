# MIB files and generator

MIB files go here. The generator turns them into `snmp.yml`.

```
mibs/
├── generate.sh       # runs the generator
├── generator.yml     # defines modules and which OIDs to walk
├── *.mib             # vendor MIB files
└── SNMPv2-*.txt      # standard RFC MIBs (the generator needs these)
```

## Modules we have

| Module     | Vendor   | What it's for                     | Metrics |
| ---------- | -------- | --------------------------------- | ------- |
| `apc_ups`  | APC      | Smart-UPS, Symmetra               | ~800    |
| `apc_pdu`  | APC      | Older rack PDUs (like the AP7801) | ~100    |
| `apc_pdu2` | APC      | Newer rack PDUs                   | ~260    |
| `unifi`    | Ubiquiti | Switches and APs                  | ~60     |

## MIB files

| File        | From          | Source                                                                               |
| ----------- | ------------- | ------------------------------------------------------------------------------------ |
| `apc.mib`   | APC/Schneider | [Schneider Electric](https://www.se.com/us/en/download/document/APC_POWERNETMIB_EN/) |
| `unifi.mib` | Ubiquiti      | Ubiquiti downloads section                                                           |

## Running the generator

```bash
./generate.sh
```

This runs the `prom/snmp-generator` Docker image, parses all the MIB files, and writes `../snmp.yml`. That file gets committed to the repo and deployed as a ConfigMap.

## Adding a new device type

1. Get the vendor's MIB file, drop it here
2. If the generator complains about missing MIBs, grab those too (usually standard RFC stuff like SNMPv2-SMI)
3. Add a module to `generator.yml`:
   ```yaml
   modules:
     my_device:
       walk:
         - 1.3.6.1.4.1.XXXXX
   ```
4. Run `./generate.sh`
5. Create a ScrapeConfig in the parent folder
6. Commit everything

## Why modules are small

Each module only walks OIDs for one device type. This keeps the ConfigMap under 1MB, reduces scrape time, and means you're not querying OIDs that don't exist on a device.

## OID reference

| Vendor   | Enterprise OID    |
| -------- | ----------------- |
| APC      | 1.3.6.1.4.1.318   |
| Ubiquiti | 1.3.6.1.4.1.41112 |
| Cisco    | 1.3.6.1.4.1.9     |
| HP/Aruba | 1.3.6.1.4.1.11    |

## When things go wrong

**"Missing MIB" errors**: Download the missing one. Usually it's a standard RFC MIB like SNMPv2-SMI or SNMP-FRAMEWORK-MIB. The generator continues anyway because of `--no-fail-on-parse-errors`.

**Module returns zero metrics**: The OIDs probably don't exist on your device. Older hardware often only implements part of the MIB. Test with snmpwalk to see what's actually there:

```bash
snmpwalk -v3 -l authNoPriv -u USER -a MD5 -A PASS DEVICE 1.3.6.1.4.1.318.1.1.12
```
