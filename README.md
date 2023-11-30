# CodeSifterPublic
# README: Search, Retrieve, and Insert Functionality

## Overview
This documentation explains the functionality of a codebase designed to process user prompts, search and retrieve relevant content from an extensive file database, and then integrate the most pertinent information into a contextual response using GPT-4.

## Requirements
- Node.js environment.
- Relevant libraries (as specified in `package.json`).

## Installation
1. Clone the repository.
2. Run `npm install` to install dependencies.

## Usage
- **Starting the Service**: Run `node index.js` to start the application.
- **Inputting Prompts**: Users can input prompts which are processed by GPT-4.
- **File Processing**: The system can handle various file types, not just PDFs.

## Function Descriptions
- **`index.js`**: Initializes the service and manages incoming prompts.
- **`siftController.js`**: Handles the extraction and analysis of data from files.

## Process Flow
1. **User Input**: A user provides a prompt along with a codebase.
2. **Keyword Creation**: GPT-4 generates relevant keywords based on the prompt.
3. **Extraction**: The system extracts chunks of information from the codebase using these keywords.
4. **Ranking**: Extracted chunks are ranked for relevance from 1-10.
5. **Integration**: Highly ranked chunks (high relevance) are integrated into the context.
6. **Response Generation**: GPT-4 uses this context to generate a response, which is then returned to the user.

## Troubleshooting
- Ensure all dependencies are correctly installed.
- Check for syntax or runtime errors in the console.

## Contact
For queries or contributions, please contact me here- cohavygal@gmail.com
