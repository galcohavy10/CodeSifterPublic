// client/src/
// SiftForm.js
import React, { useState, useRef } from 'react';
import './SiftForm.css';

function SiftForm() {
    const [directory, setDirectory] = useState(null);
    const [promptMessage, setPromptMessage] = useState('');
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);  // New state for upload progress
    const fileInputRef = useRef(null);

    const codeFileTypes = ['java', 'py', 'js', 'ts', 'c', 'cpp', 'cs', 'rb', 'php', 'go'];  // Extend this list as needed

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        const formData = new FormData();
        if (directory) {
            for (let i = 0; i < directory.length; i++) {
                formData.append('files', directory[i]);
            }
        }
        formData.append('promptMessage', promptMessage);
    
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'http://localhost:5000/sift', true);
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                setUploadProgress(percentComplete);
            }
        };
        xhr.onload = async () => {
            if (xhr.status === 200) {
                try {
                    const responseData = JSON.parse(xhr.responseText);
                    console.log('Response Data:', responseData);
                    setResult(responseData.result);
                } catch (error) {
                    console.error('Error parsing response:', error);
                }
                
            } else {
                console.error('File upload failed:', xhr.statusText);
            }
            setIsLoading(false);
        };
        xhr.send(formData);
    };
    

    const handleFileSelection = (files) => {
        const fileList = Array.from(files);
        if (fileList.length > 20) {
            alert('Please limit your selection to 20 files.');
            return;
        }
        setDirectory(fileList);  // setting fileList instead of files
    };
    
    
    const handleFileInput = (e) => handleFileSelection(e.target.files);

    const handleDrop = (e) => {
        e.preventDefault();
        const items = e.dataTransfer.items;
        const fileList = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i].webkitGetAsEntry();
            if (item) {
                if (item.isFile) {
                    // Handle file
                    item.file(file => {
                        fileList.push(file);
                    });
                } else if (item.isDirectory) {
                    // Handle directory (this will need a recursive function to traverse the directory)
                    // This part is more complex and may require server-side handling
                }
            }
        }
        if (fileList.length > 0) {
            handleFileSelection(fileList);
        }
    };
    

    return (
        <div className="form-container">
            <form className="sift-form" onSubmit={handleSubmit}>
                <div className="drag-drop-area" 
                     onDrop={handleDrop} 
                     onDragOver={(e) => e.preventDefault()}
                >
                    <input
                        type="file"
                        name="directory"
                        directory="" webkitdirectory=""
                        ref={fileInputRef}
                        onChange={handleFileInput}
                        className="file-input"
                    />
                    <p>Drag & drop a folder here, or <span onClick={() => fileInputRef.current.click()} className="file-select-text">select a folder</span></p>
                </div>
                <label className="label" htmlFor="promptMessage">
                    Prompt Message:
                    <input
                        type="text"
                        name="promptMessage"
                        value={promptMessage}
                        onChange={(e) => setPromptMessage(e.target.value)}
                        className="input"
                        id="promptMessage"
                    />
                </label>
                <button 
                    type="submit" 
                    className="submit-button" 
                    disabled={promptMessage === '' || isLoading}  // Disable button if prompt is empty or loading is true
                >
                    {isLoading ? 'Uploading...' : 'Submit'}
                </button>
            </form>
            {isLoading && <progress value={uploadProgress} max="100" />}
            {result && (
                <div className="result">
                    Result: {result}
                </div>
            )}

        </div>
    );
}

export default SiftForm;
