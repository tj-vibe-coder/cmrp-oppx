#!/bin/bash

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required but not installed. Please install Python 3 and try again."
    exit 1
fi

# Run the Python script
python3 format_csv.py

# Check if the script ran successfully
if [ $? -eq 0 ]; then
    echo "CSV formatting completed successfully."
else
    echo "Error: Failed to format CSV file."
    exit 1
fi 