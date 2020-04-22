# Multiplayer web game application: boilerplate code - Server side

This repo comprises the server side of a multiplayer web game web platform. This project has been built to act as boilerplate for others to use for making their own games. It has been written using React, Socket.io and Node.js.

This repo supports and acts as the back end for the client side aspect of this project which can be found here: https://github.com/jcraggs/web-game-boilerplate-client

## Instructions on hosting this app using Heroku

There are many ways to host applications like the one created here. One of these solutions is Heroku. Heroku provides a service that you can push your code to and it will build, run and host it. Heroku also allows for easy database integration. The Heroku [documentation](https://devcenter.heroku.com/articles/getting-started-with-nodejs) is excellent, so take a look at that. This following is a condensed version of the steps described in the Heroku docs.

## 1. Install the Heroku CLI

On macOS:

```bash
brew tap heroku/brew && brew install heroku
```

On Ubuntu:

```bash
sudo snap install --classic heroku
```

## 2. Create a Heroku App

Log into Heroku using their command line interface:

```bash
heroku login
```

Create an app in an active git directory. Doing this in the folder where your server exists is a good start, as this is what you will be hosting.

```bash
heroku create your-app-name
```

Here `your-app-name` should be the name you want to give your application. If you don't specify an app name, you'll get a random one.

This command will both create an app on Heroku for your account. It will also add a new `remote` to your git repository.
Check this by looking at your git remotes:

```bash
git remote -v
```

## 3. Push Your code up to Heroku

```bash
git push heroku master
```

## 4. Review Your App

```bash
heroku open
```

Any issues should be debugged with:

```bash
heroku logs --tail
```
