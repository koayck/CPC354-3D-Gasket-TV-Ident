# CPC354-3D-Gasket-TV-Ident

# Introduction

This project is a 3D gasket animation of a TV ident for the course CPC354 Computer Graphics & Visualization. The program is written in JavaScript and uses WebGL for rendering.

# Objective

The objective of this project is to create a 3D gasket animation of a TV ident that can be controlled by the user. The program should be able to rotate the gasket, change the number of subdivisions, and change the colors of the gasket.

# Team Members

- Lai Yicheng [@Jisi-A](https://github.com/Jisi-A)
- Ang Chin Zhen [@stikzzz](https://github.com/stikzzz)
- Koay Chun Keat [@koayck](https://github.com/koayck)
- Lee Ying Shen [@JohnasLeee](https://github.com/JohnasLeee)
- Marcus Tan Tung Chean [@Sn0wman8](https://github.com/Sn0wman8)

# Getting Started

1. Clone the repository

```bash
git clone https://github.com/Jisi-A/CPC354-3D-Gasket-TV-Ident.git
```

2. Install dependencies

```bash
npm install
```

3. Run the live server

4. You are good to go!

5. Extra:

If you intend to update the styling, you can run the following command to update the css file:

```bash
npx tailwindcss -i src/input.css -o src/output.css --watch
```

This will watch for any changes to the styling in HTML files and update the output.css file accordingly. If you wish to know more, you can visit the [Tailwind CSS installation guide](https://tailwindcss.com/docs/installation).

# Project Structure

```
CPC354-3D-Gasket-TV-Ident
├─ .gitignore
├─ .vscode
│  └─ settings.json
├─ assg_requirement.md
├─ package-lock.json
├─ package.json
├─ README.md
├─ sample (for reference)
│  ├─ gasket4.html
│  └─ gasket4.js
├─ src
│  ├─ gasket4.js (main program)
│  ├─ index.html
│  ├─ initShaders.js (contains helper functions to compile and link WebGL shaders to the application)
│  ├─ input.css
│  ├─ MV.js (provides matrix and vector manipulation functions APIs for WebGL)
│  ├─ output.css (contains tailwind utility classes)
│  └─ webgl-utils.js (standard utilities from Google to set up a WebGL context)
└─ tailwind.config.js
```