#!/bin/bash

# go-auto.sh - Fully automated script to run tests, commit, and push changes
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
  print_message "STEP 2: Tests passed! Staging all changes"
  
  # Stage all changes
  git add .
  
  # Generate a commit message based on the changes
  print_message "STEP 3: Creating commit"
  
  # Get a summary of changes for the commit message
  changed_files=$(git diff --cached --name-only)
  file_count=$(echo "$changed_files" | wc -l | tr -d ' ')
  
  # Create a commit message based on the changes
  if [ $file_count -eq 1 ]; then
    # Single file change
    file=$(echo "$changed_files" | tr -d '\n')
    commit_message="Update $file"
  else
    # Multiple file changes
    commit_message="Update BitBLT implementation ($file_count files)"
  fi
  
  echo "Using commit message: $commit_message"
  
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
