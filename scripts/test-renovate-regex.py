#!/usr/bin/env python3
"""
Renovate Regex Pattern Testing Tool

This script tests Renovate regex patterns against actual files to verify they work
correctly before adding them to renovate.json configuration. It helps debug
regex patterns that aren't matching as expected in Renovate.

Key Features:
- Test any regex pattern against any file
- Show captured groups (depName, currentValue, etc.)
- Verbose debugging to see what Renovate comments exist in files
- Works from anywhere in the project (auto-detects project root)
- Provides examples for common Renovate pattern types

Usage Examples:
    # Test Talos GitHub tags pattern
    ./scripts/test-regex.py -p "# renovate: datasource=github-tags depName=(?P<depName>siderolabs/talos)\\s*\\n\\s*image: .*:(?P<currentValue>v\\d+\\.\\d+\\.\\d+)" -f talos/patches/unified-patch.yaml

    # Test Helm chart version pattern
    ./scripts/test-regex.py -p "# renovate: datasource=helm.*depName=(?P<depName>\\S+)\\s*\\n.*version: (?P<currentValue>\\S+)" -f flux/manifests/03-services/authentik/helmrelease.yaml -v

Renovate Pattern Requirements:
- Patterns must include named capture groups for depName and currentValue
- Some patterns may need additional groups like datasource, registryUrl
- Whitespace handling is critical - use \\s* for flexible whitespace matching
- Renovate uses RE2 regex engine which can be stricter than Python regex
- Pattern order in renovate.json matters - specific patterns should come first

Author: AI Assistant
License: MIT
"""

import re
import sys
import os
import argparse

def test_renovate_regex(pattern, file_path, verbose=False):
    """
    Test a Renovate regex pattern against a file to verify it works correctly.

    This function reads a file and attempts to match the provided regex pattern
    against its content. It's designed specifically for testing Renovate custom
    manager regex patterns before adding them to renovate.json.

    Args:
        pattern (str): The regex pattern to test. Should include named capture
                      groups like (?P<depName>...) and (?P<currentValue>...)
        file_path (str): Path to the file to test against (relative to project root)
        verbose (bool): If True, shows additional debugging information including
                       the full pattern, all Renovate comments found, and context

    Returns:
        bool: True if the pattern matched successfully, False otherwise

    Example:
        >>> success = test_renovate_regex(
        ...     r"# renovate: datasource=helm depName=(?P<depName>\\S+)\\s*\\n.*version: (?P<currentValue>\\S+)",
        ...     "flux/manifests/03-services/authentik/helmrelease.yaml"
        ... )
        >>> print(f"Pattern {'worked' if success else 'failed'}")
    """

    # Validate file exists before attempting to read it
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return False

    # Read the entire file content into memory
    # Note: This assumes files are reasonably sized (< 100MB)
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        print(f"❌ Unable to read file (encoding issue): {file_path}")
        return False
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return False

    # Display what we're testing
    print(f"Testing pattern against: {file_path}")
    if verbose:
        print(f"Pattern: {pattern}")
    print("-" * 60)

    # Attempt to match the regex pattern against file content
    # Using re.search() to find the first match anywhere in the content
    try:
        match = re.search(pattern, content)
    except re.error as e:
        print(f"❌ Invalid regex pattern: {e}")
        return False

    if match:
        print("✅ Pattern matched!")

        # Extract and display all named capture groups
        # These are the values that Renovate would extract
        groups = match.groupdict()
        if groups:
            print("Captured groups:")
            for name, value in groups.items():
                # Show each captured group - these correspond to Renovate fields
                # Common groups: depName, currentValue, datasource, registryUrl
                print(f"  {name}: {value}")
        else:
            # Pattern matched but has no named groups - not useful for Renovate
            print(f"Match (no named groups): {match.group(0)}")

        if verbose:
            # Show the complete matched text for debugging
            print(f"\nFull match:")
            print(match.group(0))

        return True
    else:
        print("❌ Pattern did not match")

        if verbose:
            # Provide debugging information to help fix the pattern
            print("\nDebugging...")

            # Find all Renovate comments in the file to help user understand
            # what patterns might be available to match against
            print("Renovate comments found in file:")
            lines = content.split('\n')
            found_renovate = False

            for i, line in enumerate(lines):
                # Look for any line containing 'renovate:' (case insensitive)
                if 'renovate:' in line.lower():
                    found_renovate = True
                    print(f"  Line {i+1}: {repr(line.strip())}")

                    # Show the next few lines for context
                    # This helps see the structure Renovate needs to match
                    for j in range(1, 4):
                        if i+j < len(lines):
                            context_line = lines[i+j].strip()
                            if context_line:  # Only show non-empty lines
                                print(f"  Line {i+j+1}: {repr(context_line)}")
                    print()  # Add blank line between different Renovate comments

            if not found_renovate:
                print("  No renovate comments found in file")
                print("  Tip: Add a renovate comment like '# renovate: datasource=helm depName=myapp'")

        return False

def main():
    """
    Main entry point for the Renovate regex testing tool.

    Parses command line arguments, sets up the environment, and runs the
    regex test. This function handles:
    - Command line argument parsing and validation
    - Automatic project root detection when run from scripts/ directory
    - Error handling and appropriate exit codes
    - User-friendly help and examples

    Exit Codes:
        0: Pattern matched successfully
        1: Pattern failed to match or other error occurred
    """

    # Set up command line argument parsing with detailed help
    parser = argparse.ArgumentParser(
        description="Test Renovate regex patterns against files",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Test Talos GitHub tags pattern (note the double backslashes for escaping)
  ./scripts/test-regex.py -p "# renovate: datasource=github-tags depName=(?P<depName>siderolabs/talos)\\s*\\n\\s*image: .*:(?P<currentValue>v\\d+\\.\\d+\\.\\d+)" -f talos/patches/unified-patch.yaml

  # Test Helm chart pattern with verbose output
  ./scripts/test-regex.py -p "# renovate: datasource=helm.*depName=(?P<depName>\\S+)\\s*\\n.*version: (?P<currentValue>\\S+)" -f flux/manifests/03-services/authentik/helmrelease.yaml -v

  # Test generic version pattern from renovate.json
  ./scripts/test-regex.py -p "# renovate: datasource=(?P<datasource>\\S+).*depName=(?P<depName>\\S+)\\s*\\n\\s*version: (?P<currentValue>\\S+)" -f some-file.yaml

Tips:
  - Use double backslashes (\\\\) to escape regex special characters
  - Named groups (?P<name>...) are required for Renovate compatibility
  - Common group names: depName, currentValue, datasource, registryUrl
  - Use -v/--verbose flag to see debugging information when patterns fail
  - Test patterns before adding them to renovate.json to save time
        """
    )

    # Define required and optional command line arguments
    parser.add_argument('-p', '--pattern', required=True,
                        help='Regex pattern to test (use double backslashes for escaping)')
    parser.add_argument('-f', '--file', required=True,
                        help='File path to test against (relative to project root)')
    parser.add_argument('-v', '--verbose', action='store_true',
                        help='Show verbose debugging information')

    # Parse command line arguments
    args = parser.parse_args()

    print("Renovate Regex Pattern Tester")
    print("=" * 40)

    # Auto-detect project root if running from scripts/ directory
    # This allows the script to work regardless of where it's called from
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if os.path.basename(script_dir) == 'scripts':
        project_root = os.path.dirname(script_dir)
        os.chdir(project_root)
        print(f"Changed to project root: {project_root}")

    # Run the actual regex test
    success = test_renovate_regex(args.pattern, args.file, args.verbose)

    # Provide appropriate feedback and exit with correct code
    if success:
        print("\n🎉 Pattern matched successfully!")
        print("This regex should work in your Renovate configuration.")
        print("You can now add it to the 'matchStrings' array in renovate.json")
        sys.exit(0)  # Success exit code
    else:
        print("\n❌ Pattern failed to match.")
        print("Consider adjusting the regex or checking the file content.")
        print("Use -v/--verbose for more debugging information.")
        print("\nCommon issues:")
        print("- Missing or incorrect escape characters (use double backslashes)")
        print("- Whitespace doesn't match (try \\s* for flexible whitespace)")
        print("- Named capture groups missing or incorrectly named")
        print("- Pattern too specific or too generic for the actual file content")
        sys.exit(1)  # Error exit code

if __name__ == "__main__":
    # Entry point when script is run directly
    # This allows the script to be imported as a module without running main()
    main()
