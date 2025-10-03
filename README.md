# 🪞 PDFMirror

## 📌 Overview
**PDFMirror** is a modern and minimalistic web application built entirely with **Angular 19**, enabling users to manage PDF files directly in the browser. This project was created to demonstrate the power of client-side manipulation using the **pdf-lib** library — without requiring any backend.

The application allows users to:

✅ **Upload and preview PDF files**  
✅ **Edit and overwrite visual information (e.g., text like value or recipient)**  
✅ **Clone the original PDF and download it with a custom filename**  

All functionality runs entirely in the browser, ensuring privacy and performance with a seamless UI powered by **Bootstrap 5**.

## 🏗️ Project Structure
```
-app
  -app.component.ts
  -app.component.html
  -app.component.scss
  -app.module.ts // or standalone component setup
-assets
  -styles.scss
-angular.json
```

## ⚙️ Features

- 📤 **Upload PDF**: Choose a PDF file from your device  
- 👁️ **Preview**: Instantly view the selected file via embedded viewer  
- ✏️ **Edit**: Modify visible values (e.g., masking and overwriting text)  
- 🧬 **Clone**: Generate a perfect replica using `pdf-lib`  
- 📝 **Rename**: Prompt user to rename the file before download (extension enforced as `.pdf`)  
- 💡 **All client-side**: No server communication; pure browser logic  

## 🚀 Getting Started

### 📋 Prerequisites
Ensure the following are installed:

- [Node.js](https://nodejs.org/) (v16+ recommended)  
- [Angular CLI](https://angular.io/cli) (v15+ or latest)  
- A modern web browser (Chrome, Firefox, Edge, etc.)

---

### 🔧 Installation
```sh
git clone https://github.com/omatheusribeiro/pdf-mirror.git
```
```sh
cd pdf-mirro
```
```sh
# Install dependencies
npm install
```

### ▶️ Running the Project
```sh
ng serve
```
Then open your browser and go to: **http://localhost:4200/** 🚀

## 🛠️ Technologies Used
- **Angular 19**
- **pdf-lib**
- **Bootstrap 5**
- **TypeScript**
- **HTML & CSS**

## 📜 License
This project is licensed under the BSD-2-Clause license.

