# Real-time Communication and Collaboration Tools

## Project Overview

This is a modern, real-time chat and collaboration application designed to facilitate seamless communication between users. It leverages WebSockets for instant message delivery and provides features like media sharing, user authentication, and a responsive user interface.

## Features

* **Real-time Messaging:** Instantaneous sending and receiving of text messages.
* **User Authentication:** Secure user registration and login.
* **Media Sharing:** Ability to upload and share images, audio, and video files.
* **Cloud-based Storage:** Media files are uploaded directly to Cloudinary, ensuring scalability and efficient storage, without saving files locally on the server.
* **Responsive UI:** A user-friendly interface that adapts to different screen sizes.

## Technologies Used

### Frontend (Client)

* **React.js:** A JavaScript library for building user interfaces.
* **Vite:** A fast build tool for modern web projects.
* **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
* **Socket.IO Client:** For real-time, bidirectional communication with the server.
* **Axios:** Promise-based HTTP client for making API requests.

### Backend (Server)

* **Node.js:** JavaScript runtime environment.
* **Express.js:** A fast, unopinionated, minimalist web framework for Node.js.
* **Socket.IO:** For real-time, bidirectional communication with the client.
* **MongoDB:** NoSQL database for storing user data and messages.
* **Mongoose:** MongoDB object data modeling (ODM) for Node.js.
* **Cloudinary:** Cloud-based image and video management for media uploads.
* **Multer:** Node.js middleware for handling `multipart/form-data`, primarily used for file uploads.
* **JSON Web Tokens (JWT):** For secure user authentication.
* **Bcrypt.js:** For password hashing.
* **dotenv:** To manage environment variables.

## Project Structure

The project is organized into two main directories:

* `client/`: Contains all the frontend (React.js) code.
* `Server/`: Contains all the backend (Node.js/Express.js) code.
