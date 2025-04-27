# AI Fitness Tracker

A **real-time fitness tracking web app** using **React.js** and **MediaPipe** for live pose detection and exercise evaluation.  
It helps users improve form during exercises like **push-ups** and **squats** by providing instant feedback.

## ✨ Features

- Real-time pose detection via webcam
- Live visual feedback on body movements
- Exercise selection (Push-Ups, Squats)
- Clean and modular folder structure
- Responsive web design

---

## 🛠️ Folder Structure

```
AIFitnessTracker/
├── public/             # Public assets (index.html, icons, etc.)
├── src/
│   ├── components/     # Reusable UI components (Header, ExerciseSelector, etc.)
│   ├── pages/          # Main pages (Home.js, Exercise.js)
│   ├── utils/          # Utility functions (pose detection helpers)
│   ├── App.js          # Main app component
│   ├── index.js        # Entry point
├── package.json        # Project dependencies and scripts
├── README.md           # Documentation
```

---

## 📦 Installation

1. **Clone the Repository**

```bash
git clone https://github.com/shivakumar12012004/AIFitnessTracker.git
cd AIFitnessTracker
```

2. **Install Dependencies**

```bash
npm install
```

3. **Start the Development Server**

```bash
npm start
```
Open your browser at [http://localhost:3000](http://localhost:3000)

---

## 📚 Modules and Libraries Used

| Module        | Purpose                                         |
| ------------- | ------------------------------------------------ |
| React.js       | Frontend UI development                        |
| MediaPipe Pose | Real-time human pose detection                 |      
| CSS            | Styling and responsiveness                    |

---

## 🚀 How It Works

- Activates user's webcam.
- Detects body joints using MediaPipe's Pose model.
- Tracks user exercises and provides visual feedback.
- Color codes joints based on posture accuracy.

---

## 🧹 Future Improvements

- Add more exercise types (e.g., Plank, Lunges)
- Track repetitions automatically
- AI-based corrective feedback (voice alerts)
- Connect to a backend to save workout history

---

## 🤝 Contribution

Contributions are welcome!  
Please fork this repository and submit a pull request.

---

## 📄 License

This project is licensed under the MIT License.

---

Would you also like me to suggest a **badge** version (with live GitHub badges like `react`, `made with love`, etc.) to make it even more attractive? 🚀  
Let me know! 🔥
