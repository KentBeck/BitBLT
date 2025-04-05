#!/bin/bash

# go.sh - Automated script to run tests, commit, and push changes
# Created by Kent Beck with Augment AI

# Set -e to exit immediately if any command fails
set -e

# Print a message with a border
print_message() {
  local message="$1"
  local length=${#message}
  local border=$(printf '=%.0s' $(seq 1 $((length + 4))))
  
  echo ""
  echo "$border"
  echo "  $message"
  echo "$border"
  echo ""
}

# Step 1: Run tests
print_message "STEP 1: Running tests"
npm test

# If tests pass, proceed to commit
if [ $? -eq 0 ]; then
  print_message "STEP 2: Tests passed! Staging changes"
  
  # Ask for files to stage
  echo "Enter files/directories to stage (space-separated, or '.' for all):"
  read -p "> " files_to_stage
  
  if [ -z "$files_to_stage" ]; then
    files_to_stage="."
  fi
  
  # Stage the files
  git add $files_to_stage
  
  # Ask for commit message
  print_message "STEP 3: Creating commit"
  echo "Enter commit message:"
  read -p "> " commit_message
  
  if [ -z "$commit_message" ]; then
    commit_message="Update BitBLT implementation"
  fi
  
  # Commit the changes
  git commit -m "$commit_message"
  
  # Push to remote
  print_message "STEP 4: Pushing to remote"
  git push origin main
  
  print_message "SUCCESS: All steps completed successfully!"
else
  print_message "ERROR: Tests failed. Fix the issues before committing."
  exit 1
fi
