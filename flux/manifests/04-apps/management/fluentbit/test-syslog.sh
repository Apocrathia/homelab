#!/bin/bash
# Test script for syslog collection
# This script sends test syslog messages to the Fluent Bit collector
# Based on RFC 3164 and RFC 5424 specifications

SYSLOG_HOST="10.100.1.96"  # Your LoadBalancer IP
SYSLOG_UDP_PORT="514"
SYSLOG_TCP_PORT="6514"

echo "Testing syslog collection..."
echo "Target: ${SYSLOG_HOST}"
echo ""

# RFC 3164 (BSD Syslog) Examples
echo "=== RFC 3164 (BSD Syslog) Tests ==="
echo "Sending RFC 3164 auth failure message..."
echo "<34>$(date -u '+%b %d %H:%M:%S') test-host su[12345]: 'su root' failed for user on /dev/pts/0" | nc -u -w 1 ${SYSLOG_HOST} ${SYSLOG_UDP_PORT}

echo "Sending RFC 3164 kernel message..."
echo "<0>$(date -u '+%b %d %H:%M:%S') test-host kernel: [12345.678901] TCP: Peer 192.168.1.100:80 unexpectedly shrunk window" | nc -u -w 1 ${SYSLOG_HOST} ${SYSLOG_UDP_PORT}

echo "Sending RFC 3164 mail message..."
echo "<16>$(date -u '+%b %d %H:%M:%S') test-host postfix[12345]: connect from unknown[192.168.1.100]" | nc -u -w 1 ${SYSLOG_HOST} ${SYSLOG_UDP_PORT}

echo "Sending RFC 3164 daemon message..."
echo "<30>$(date -u '+%b %d %H:%M:%S') test-host sshd[12345]: Accepted publickey for root from 192.168.1.100 port 22 ssh2" | nc -u -w 1 ${SYSLOG_HOST} ${SYSLOG_UDP_PORT}

echo ""

# RFC 5424 (Structured Syslog) Examples
echo "=== RFC 5424 (Structured Syslog) Tests ==="
echo "Sending RFC 5424 auth failure message..."
echo "<34>1 $(date -u '+%Y-%m-%dT%H:%M:%S.000Z') test-host.example.com su 12345 ID47 - 'su root' failed for user on /dev/pts/0" | nc -w 1 ${SYSLOG_HOST} ${SYSLOG_TCP_PORT}

echo "Sending RFC 5424 with structured data..."
echo "<34>1 $(date -u '+%Y-%m-%dT%H:%M:%S.000Z') test-host.example.com su 12345 ID47 [auth@12345 user=\"testuser\" tty=\"/dev/pts/0\"] Authentication failure" | nc -w 1 ${SYSLOG_HOST} ${SYSLOG_TCP_PORT}

echo "Sending RFC 5424 kernel message..."
echo "<0>1 $(date -u '+%Y-%m-%dT%H:%M:%S.000Z') test-host.example.com kernel 12345 - - TCP: Peer 192.168.1.100:80 unexpectedly shrunk window" | nc -w 1 ${SYSLOG_HOST} ${SYSLOG_TCP_PORT}

echo "Sending RFC 5424 mail message..."
echo "<16>1 $(date -u '+%Y-%m-%dT%H:%M:%S.000Z') test-host.example.com postfix 12345 ID48 - connect from unknown[192.168.1.100]" | nc -w 1 ${SYSLOG_HOST} ${SYSLOG_TCP_PORT}

echo ""

# Mixed format tests
echo "=== Mixed Format Tests ==="
echo "Sending RFC 3164 via TCP..."
echo "<30>$(date -u '+%b %d %H:%M:%S') test-host sshd[12345]: Accepted publickey for root from 192.168.1.100 port 22 ssh2" | nc -w 1 ${SYSLOG_HOST} ${SYSLOG_TCP_PORT}

echo "Sending RFC 5424 via UDP..."
echo "<34>1 $(date -u '+%Y-%m-%dT%H:%M:%S.000Z') test-host.example.com su 12345 ID49 - Authentication failure" | nc -u -w 1 ${SYSLOG_HOST} ${SYSLOG_UDP_PORT}

echo ""

# Edge cases and malformed messages
echo "=== Edge Cases and Malformed Messages ==="
echo "Sending message with invalid priority..."
echo "<999>1 $(date -u '+%Y-%m-%dT%H:%M:%S.000Z') test-host test 12345 - - Invalid priority message" | nc -u -w 1 ${SYSLOG_HOST} ${SYSLOG_UDP_PORT}

echo "Sending plain text (not syslog)..."
echo "This is just plain text, not a syslog message" | nc -u -w 1 ${SYSLOG_HOST} ${SYSLOG_UDP_PORT}

echo "Sending malformed timestamp..."
echo "<34>1 INVALID-TIMESTAMP test-host test 12345 - - Malformed timestamp message" | nc -u -w 1 ${SYSLOG_HOST} ${SYSLOG_UDP_PORT}

echo "Sending message with missing fields..."
echo "<34>1 $(date -u '+%Y-%m-%dT%H:%M:%S.000Z') test-host" | nc -u -w 1 ${SYSLOG_HOST} ${SYSLOG_UDP_PORT}

echo ""
echo "=== Test Summary ==="
echo "Sent various RFC 3164 and RFC 5424 test messages"
echo "Check Loki for logs with job=fluentbit and component=syslog"
echo "Look for parsed fields: facility, severity, hostname, app_name, msgid, etc."
