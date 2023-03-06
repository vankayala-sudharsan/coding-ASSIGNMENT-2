const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "twitterClone.db");
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

function AuthenticationwithJWTToken(request, response, next) {
  let jwtToken;
  const authHead = request.headers["authorization"];

  if (authHead !== undefined) {
    jwtToken = authHead.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "my_secret_token", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.user_id = payload;
        next();
      }
    });
  }
}

app.get(
  "/user/following/",
  AuthenticationwithJWTToken,
  async (request, response) => {
    const { user_id } = request;

    const query = ` select user.name
    from user inner join follower on user.user_id = follower.following_user_id
    where follower.follower_user_id = ${user_id};`;
    const respo = await db.all(query);
    response.send(respo);
  }
);

app.get(
  "/user/followers/",
  AuthenticationwithJWTToken,
  async (request, response) => {
    const { user_id } = request;

    const query = ` select user.name
    from user inner join follower on user.user_id = follower.follower_user_id
    where follower.following_user_id = ${user_id};`;
    const respo = await db.all(query);
    response.send(respo);
  }
);

app.get(
  "/tweets/:tweetId/",
  AuthenticationwithJWTToken,
  async (request, response) => {
    const { tweetId } = request.params;

    const { user_id } = request;
    let isFollowing = false;

    const query = ` select user_id
    from user inner join follower on user.user_id = follower.following_user_id
    where follower.follower_user_id = ${user_id};`;
    const followingUserids = await db.all(query);

    const tweetQuery = `SELECT * FROM tweet WHERE tweet_id= ${tweetId}; `;
    const tweets = await db.get(tweetQuery);

    for (let each of followingUserids) {
      if ((tweets.user_id = each.user_id)) {
        isFollowing = true;
      }
    }
    if (isFollowing !== true) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      const followinttweetQuery = `SELECT tweet,COUNT(like_id) AS likes,COUNT(reply_id) AS replies,date_time AS dateTime 
                            FROM tweet INNER JOIN reply ON tweet.tweet_id = reply.tweet_id INNER JOIN like ON tweet.tweet_id = like.tweet_id
                            WHERE tweet.tweet_id = ${tweetId};`;
      const respoArray = await db.get(followinttweetQuery);
      response.send(respoArray);
    }
  }
);

app.get(
  "/tweets/:tweetId/likes/",
  AuthenticationwithJWTToken,
  async (request, response) => {
    const { tweetId } = request.params;

    const { user_id } = request;
    let isFollowing = false;

    const query = ` select user_id
    from user inner join follower on user.user_id = follower.following_user_id
    where follower.follower_user_id = ${user_id};`;
    const followingUserids = await db.all(query);

    const tweetQuery = `SELECT * FROM tweet WHERE tweet_id= ${tweetId}; `;
    const tweets = await db.get(tweetQuery);

    for (let each of followingUserids) {
      if ((tweets.user_id = each.user_id)) {
        isFollowing = true;
      }
    }
    if (isFollowing !== true) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      const nameArray = [];
      const followinttweetQuery = `SELECT name FROM user INNER JOIN like ON user.user_id = like.user_id WHERE tweet_id = ${tweetId};`;
      const respoArray = await db.all(followinttweetQuery);
      for (let each of respoArray) {
        nameArray.push(each.name);
      }
      response.send({ likes: nameArray });
    }
  }
);

app.get(
  "/tweets/:tweetId/replies/",
  AuthenticationwithJWTToken,
  async (request, response) => {
    const { tweetId } = request.params;

    const { user_id } = request;
    let isFollowing = false;

    const query = ` select user_id
    from user inner join follower on user.user_id = follower.following_user_id
    where follower.follower_user_id = ${user_id};`;
    const followingUserids = await db.all(query);

    const tweetQuery = `SELECT * FROM tweet WHERE tweet_id= ${tweetId}; `;
    const tweets = await db.get(tweetQuery);

    for (let each of followingUserids) {
      if ((tweets.user_id = each.user_id)) {
        isFollowing = true;
      }
    }
    if (isFollowing !== true) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      const replyArray = [];
      const followinttweetQuery = `SELECT name,reply FROM user INNER JOIN reply ON user.user_id = reply.user_id WHERE tweet_id = ${tweetId};`;
      const respoArray = await db.all(followinttweetQuery);
      for (let each of respoArray) {
        replyArray.push(each);
      }
      response.send({ replies: replyArray });
    }
  }
);

app.get(
  "/user/tweets/",
  AuthenticationwithJWTToken,
  async (request, response) => {
    const { user_id } = request;
    const query = `SELECT tweet,COUNT(like_id) AS likes,COUNT(reply_id) AS replies,date_time AS dateTime 
                            FROM tweet INNER JOIN reply ON tweet.tweet_id = reply.tweet_id INNER JOIN like ON tweet.tweet_id = like.tweet_id
                            WHERE tweet.user_id = ${user_id};`;
    const respo = await db.all(query);
    response.send(respo);
  }
);

app.get(
  "/user/tweets/feed/",
  AuthenticationwithJWTToken,
  async (request, response) => {
    const query = `SELECT username,tweet,date_time AS dateTime
                     FROM user INNER JOIN tweet WHERE user.user_id = tweet.user_id
                     ORDER BY dateTime DESC LIMIT 4 OFFSET 1;`;
    const responseArray = await db.all(query);
    response.send(responseArray);
  }
);

app.post(
  "/user/tweets/",
  AuthenticationwithJWTToken,
  async (request, response) => {
    const { user_id } = request;
    const { tweet } = request.body;
    const query = `INSERT INTO tweet(tweet,user_id,date_time)
                       VALUES('${tweet}',${user_id},'2023-03-06 14:40:15');`;
    await db.run(query);
    response.send("Created a Tweet");
  }
);

app.delete(
  "/tweets/:tweetId/",
  AuthenticationwithJWTToken,
  async (request, response) => {
    const { user_id } = request;
    const { tweetId } = request.params;
    const query = `SELECT * FROM tweet WHERE tweet_id = ${tweetId};`;
    const tweet = await db.get(query);
    if (tweet.user_id != user_id) {
      query2 = `DELETE FROM tweet where tweet_id = ${tweetId};`;
      await db.run(query2);
      response.send("Tweet Removed");
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

app.post("/register/", async (request, response) => {
  const userDetails = request.body;
  const { username, password, name, gender } = userDetails;
  const userExistQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const isUserExist = await db.get(userExistQuery);
  if (isUserExist !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else if (password.length < 6) {
    response.status(400);
    response.send("Password is too short");
  } else {
    const hashedPaasword = await bcrypt.hash(password, 10);
    const registerQuery = `INSERT INTO user(name,username,password,gender)
                              VALUES('${name}','${username}','${hashedpaasword}','${gender}');`;
    await db.run(registerQuery);
    response.status(200);
    response.send("User created successfully");
  }
});

app.post("/login/", async (request, response) => {
  const userDetails = request.body;
  const { username, password } = userDetails;
  const userExistQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const isUserExist = await db.get(userExistQuery);
  if (isUserExist === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else if (isUserExist !== undefined) {
    const isPasswordMatched = await bcrypt.compare(
      password,
      isUserExist.password
    );
    if (isPasswordMatched !== true) {
      response.status(400);
      response.send("Invalid password");
    } else {
      const payload = isUserExist.user_id;
      console.log(payload);
      const jwtToken = await jwt.sign(payload, "my_secret_token");
      response.status(200);
      response.send({ jwtToken });
    }
  }
});

module.exports = app;
