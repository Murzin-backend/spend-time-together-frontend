# spend time together

> An app for planning and spending leisure time together with friends. Pick activities, suggest your own options, and let chance decide what you are doing today!

## ✨ About

**spend time together** is a platform that helps groups of friends organise things to do together. No more long arguments about which film to watch or which game to play. Create an event, throw in some options, and the randomiser picks one for you!

## 🚀 Features

*   🔐 **Authentication:** Secure sign-up and sign-in.
*   🚪 **Invite-only rooms:** Create private groups and invite friends with a unique code.
*   📅 **Event calendar:** Plan activities for any date.
*   🎲 **Activity selection:** Choose what you are doing (playing, watching, reading) and set filters.
*   💡 **Idea bank:** Every participant can suggest their own option for an event.
*   🎉 **Random pick:** The system randomly selects one of the suggested options for everyone to follow.

## 🛠️ Technologies

*   **Frontend:** React, TypeScript, CSS
*   **Routing:** React Router
*   **Package manager:** npm

## ⚙️ Getting started

Follow these steps to run the project locally.

### Installation

1.  Clone the repository:
    ```sh
    git clone https://github.com/murzin-ml/spend-time-together-frontend.git
    ```
2.  Change into the project directory:
    ```sh
    cd spend-time-together-frontend
    ```
3.  Run Docker Compose to build and start the application.

### Local development (dev)

For local testing use `docker-compose.dev.yml`. The frontend will talk to the backend at `http://localhost:8000/api`:

```sh
docker-compose -f docker-compose.dev.yml up --build -d
```

The application is available at `http://localhost:3000`.

> Make sure the backend (`spend-time-together`) is running and reachable on port 8000.

### Production

For a production build use the main `docker-compose.yml`. The frontend will call the API at `https://spend-time-together.ru/api`:

```sh
docker-compose up --build -d
```

The application is served on port 80.
