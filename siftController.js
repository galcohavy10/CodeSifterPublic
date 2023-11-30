//codebaseSiftController.js
// const { get } = require('mongoose');



//requirements for using GPT-4 and 3.5
const express = require('express');

const { Configuration, OpenAIApi } = require("openai");
require('dotenv').config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const fs = require('fs');
const glob = require('glob');
const path = require('path');




//configures a message with codebase sifting extension and returns it
exports.codebaseSift = async function (codebase, messagePrompt) {
    let attempt = 0;
    let wordsThatDidntWork = []; //words that don't yield good chunks
    let codeChunks = [];

    while (attempt < 5) {
        const significantWords = await this.getSignificantWords(messagePrompt, wordsThatDidntWork);
        console.log(significantWords);
        // Test getCodeChunksQuery
        codeChunks = await this.getCodeChunksQuery(codebase, significantWords);
        if (codeChunks) {
            console.log('codeChunks: ', codeChunks);
            break; 
        } else {
            console.log ('no code chunks found');
            wordsThatDidntWork.push(significantWords);
            attempt++;
        }
    }

    // Test getRelevantCodeChunks
    const relevantCodeChunks = await this.getRelevantCodeChunks(codeChunks, messagePrompt);
    console.log('relevantCodeChunks: ', relevantCodeChunks);

    console.log('getting final answer');
    const finalAnswer = await this.askCodingQuestion(relevantCodeChunks, messagePrompt);
    console.log('finalAnswer: ', finalAnswer);

    return finalAnswer;
}

exports.getSignificantWords = async function (messagePrompt, wordsThatDidntWork = [], userSampleCode = '') {

    //get significant words in  a message using GPT
    try {
        console.log('messagePrompt: ', messagePrompt);
        // const sampleSnippets = await getSampleSnippets(codebase);
        let systemMessage = `
        User will send you a question, you will respond with [String] of 10+ useful queries they can use to find code in their existing files that relates to their question. 

        You are to give queries that are likely to find similar functions or RELATED functions, classes or FILENAMES.
        An example response to question: "make me an API call for editing a post." 
        response: 
        [
            "createPost",
            "deletePost",
            "readPost",
            "getPost",
            "postDetail",
            "postController",
             ...
        ]    
        You want to make sure to eliminate words that wouldn't yield relevant results in codebase 
        (too general or too specific)
`
        if (userSampleCode !== '') {
            systemMessage += `here's the user's style of coding (random chunks of their code): ` + userSampleCode + `    `;

        }
        
        if (wordsThatDidntWork.length > 0) {
            systemMessage += `

            Here are the words that didn't work and yielded 0 results: ` + wordsThatDidntWork;
        }

        const prompt = messagePrompt;
        const response = await openai.createChatCompletion({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: prompt },
            ],
            max_tokens: 1000,
            temperature: 1,
            n: 1,
            stop: "<<END>>",
        });

        console.log('prompt: ', prompt);
          
        if (response.data.choices && response.data.choices.length > 0) {
            let responseContent = response.data.choices[0].message.content;
        
            // make into array obj
            const significantWordsArray = JSON.parse(responseContent);
            return significantWordsArray;
        } else {
            console.log('No response choices found');
            throw new Error('No response choices found');
        }
          
    } catch (error) {
        console.error(error);
        throw error;
    }
}

exports.getCodeChunksQuery = async function (codebasePath, significantWords) {
    console.log('codebasePath: ', codebasePath + ` and significantWords: ${significantWords}`);

    // Adjust the glob pattern and options to ignore node_modules and only match files
    let filePaths = glob.sync(codebasePath + '/**/*.*', { nodir: true });
    
    // Manually filter out node_modules directory and unwanted file extensions
    const allowedExtensions = ['.js', '.py', '.swift', '.java', '.c', '.cpp', '.cs', '.h', '.html', '.css', '.ts', '.go', '.rb', '.sh', '.php', '.r'];
    filePaths = filePaths.filter(filePath => {
        return !filePath.includes('node_modules') && allowedExtensions.includes(path.extname(filePath).toLowerCase());
    });

    const matchedChunks = [];


    for (const filePath of filePaths) {
        console.log(`Processing file ${filePath}`)
        //note that .includes method is used to be more sensitive to the words that might match
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const fileName = path.basename(filePath).toLowerCase(); 
            for (const word of significantWords) {
                const lowerCaseWord = word.toLowerCase()
                const regex = new RegExp(`(.*${word}.*)`, 'gi'); // ensure that the search is case-insensitive
                const matches = fileContent.match(regex);

                if (matches) {
                    console.log(`Match found for word "${word}" in file: ${filePath}`);
                    matches.forEach(match => {
                        const paragraph = extractParagraph(fileContent, match);
                        matchedChunks.push({ filePath, match, paragraph });
                    });
                } else if (fileName.includes(lowerCaseWord)) {
                    console.log(`Match found for word "${word}" in file name: ${filePath}`);

                    //prefix the file content with the word that was matched so that it can extract beginning of file
                    const prefixedFileContent = `File name contains: ${word}\n\n${fileContent}`;
                    const paragraph = extractParagraph(prefixedFileContent, `File name contains: ${word}`);
                    matchedChunks.push({ filePath, match: `File name contains: ${word}`, paragraph });
                }
            }
        } catch (error) {
            console.error(`Error processing file ${filePath}:`, error.message);
        }
    }

    return matchedChunks;
};

exports.getRandomCodeSamples = async function (codebasePath) {
    console.log('codebasePath: ', codebasePath);

    // Adjust the glob pattern and options to ignore node_modules and only match files
    let filePaths = glob.sync(codebasePath + '/**/*.*', { nodir: true });
    
    // Manually filter out node_modules directory and unwanted file extensions
    const allowedExtensions = ['.js', '.py', '.swift', '.java', '.c', '.cpp', '.cs', '.h', '.html', '.css', '.ts', '.go', '.rb', '.sh', '.php', '.r'];
    filePaths = filePaths.filter(filePath => {
        return !filePath.includes('node_modules') && allowedExtensions.includes(path.extname(filePath).toLowerCase());
    });

    const matchedChunks = [];

    for (const filePath of filePaths) {
        console.log(`checking file ${filePath}`)
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const lines = fileContent.split('\n');
            
            for (let i = 0; i < 2; i++) {  // Loop 2 times to extract 2 chunks
                const randomIndex = Math.floor(Math.random() * (lines.length - 9));  // Adjust to ensure there's room for 9 lines
                const chunkStart = randomIndex;
                const chunkEnd = Math.min(randomIndex + 9, lines.length);  // Ensure the end index is within bounds
                const chunk = lines.slice(chunkStart, chunkEnd).join('\n');
                matchedChunks.push({ filePath, paragraph: chunk });
            }
    
        } catch (error) {
            console.error(`Error processing file ${filePath}:`, error.message);
        }
    }

    return matchedChunks;
}

function extractParagraph(text, match) {
    const lines = text.split('\n');
    const matchingLineIndex = lines.findIndex(line => line.includes(match));

    if (matchingLineIndex === -1) return '';

    const isExcludableLine = line => {
        const trimmedLine = line.trim();
        return (
            trimmedLine.startsWith('//') ||  //remove comments
            trimmedLine.startsWith('/*') || 
            /^(\s*(let|const|var)\s+\w+\s*=).*$/.test(trimmedLine) // remove the lines that are just declarations
        );
    };

    let start = matchingLineIndex;
    while (start > 0 && !isExcludableLine(lines[start - 1])) start--;

    let end = matchingLineIndex + 8;
    while (end < lines.length - 1 && !isExcludableLine(lines[end + 1])) end++;

    const paragraph = lines.slice(start, end + 1).join('\n');

    return paragraph;
}



exports.getRelevantCodeChunks = async function (codeChunks, messagePrompt) {
    console.log ('number of code chunks: ', codeChunks.length);
    //get the most relevant code chunks (3-7 based on needs)
    
    // Wrap your logic in a function that returns a promise
    async function getGptRating(codeChunk, index) {
        console.log(`getting rating for code chunk ${index}`);
        const systemMessage = `
        user has asked to do this: ` + `` + messagePrompt + `` + `

        How relevant is this piece of code to the prompt?
        YOU MAY ONLY RESPOND WITH NUMBER RATING 1-10, if the code is irrelevant or was just a required const at top of irrelevant file, you may respond with 0
        `;
        const prompt = messagePrompt;
        const gptResponse = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: prompt },
            ],
            max_tokens: 1000,
            temperature: 1,
            n: 1,
            stop: "<<END>>",
        });

        const ratingText = gptResponse.data.choices[0].message.content.trim();
        const rating = parseFloat(ratingText);
        codeChunk.gptRating = rating;
    }



    // Use a for loop to process each code chunk sequentially with a delay
    for (let index = 0; index < codeChunks.length; index++) {
        try {
            // Await the getGptRating function
            await getGptRating(codeChunks[index], index);
            // Introduce a delay before processing the next code chunk
            // executes one second delay 50% of the time
            // if (Math.random() < 0.5) {
            //     await new Promise(resolve => setTimeout(resolve, 1000));
            // }
        } catch (error) {
            console.error(`Error obtaining rating for code chunk ${index}:`, error);
            // You could potentially set a default rating or do something else here
            // codeChunks[index].gptRating = defaultRating;  // for example
        }
    }

    //sort code chunks by gpt rating
    codeChunks.sort((a, b) => b.gptRating - a.gptRating);

    //return the top 5 code chunks for now
    return codeChunks.slice(0, 5);

}

exports.askCodingQuestion = async function (relevantCodeChunks, messagePrompt, res) {
    let systemMessage;
    if (relevantCodeChunks.length === 0) {
        systemMessage = `Answer as coding expert`;
    } else {
        systemMessage = ` And use this context from user's codebase:\n\n`;
        relevantCodeChunks.forEach(chunk => {
            systemMessage += chunk.paragraph + 'came from file: ' + chunk.filePath;
        });
    }

    const chat = openai.createChatCompletion({
        model: 'gpt-4',
        stream: true,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: messagePrompt },
        ],
        max_tokens: 1000,
        temperature: 1,
        n: 1,
        stop: "<<END>>",
    }, { responseType: 'stream' });

    let assistantMessage = '';

    chat.then((resp) => {
      resp.data.on('data', (chunk) => {
        const payloads = chunk.toString().split('\n\n');
        for (const payload of payloads) {
          if (payload.includes('[DONE]')) {
            assistantMessage += payload.replace('[DONE]', '').trim();
            // res.write(`\nResponse: ${assistantMessage}`);
            // res.end();
            console.log(assistantMessage);
            return assistantMessage;
          }
          if (payload.startsWith('data:')) {
            try {
              const data = JSON.parse(payload.replace('data: ', ''));
              const text = data.choices[0].delta?.content;
              if (text) {
                assistantMessage += text;
                console.log(text)
                // res.write(`${text}`);
              }
            } catch (error) {
              console.log(`Error with JSON.parse and ${payload}.\n${error}`);
            }
          }
        }
      });
    }).catch((error) => {
      console.error('Error with OpenAI API:', error.response.data);
      res.status(500).send("Error with API:" + error.response.data);
    });
};











