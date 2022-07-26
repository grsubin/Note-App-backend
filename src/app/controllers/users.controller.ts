import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import User from "../util/user.db.query";
import pool from "../config/db";
import {
  ErrorHandler,
  getErrorMessage,
  getErrorStatusCode,
} from "../util/ErrorHandler";
import { NextFunction, Request, Response } from "express";

//Get all users
const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dbUsers = await pool.query("SELECT * FROM users ");

    let userList;
    userList = dbUsers.rows;
    if (dbUsers.rowCount == 0) {
      throw new ErrorHandler(404, "No User Available.");
    } else {
      res.json(userList);
    }
  } catch (error) {
    res.status(getErrorStatusCode(error)).send({
      message: getErrorMessage(error),
    });
  }
};

//Post new User
const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { username, firstName, lastName, email, password, phone } = req.body;
    username = username.toLowerCase();
    firstName = firstName.toLowerCase();
    lastName = lastName.toLowerCase();
    email = email.toLowerCase();

    const bcryptedPassword = bcrypt.hashSync(password, 8);
    const guid = uuidv4();

    //Doesn't add new User if either username/email is repeated and deleted_at is NULL (if deleted_at is NULL then active user exists)
    if (
      (
        await pool.query(
          "SELECT * FROM users WHERE username = $1 AND deleted_at IS NULL ",
          [username]
        )
      ).rowCount !== 0
    ) {
      throw new ErrorHandler(409, "username already in use.");
    } else if (
      (
        await pool.query(
          "SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL",
          [email]
        )
      ).rowCount !== 0
    ) {
      throw new ErrorHandler(409, "Email already in use");
    } else {
      const dbUser = await pool.query(
        "INSERT INTO users (username, first_name, last_name, email, password, phone, guid, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING username, first_name, last_name, email, password, phone, guid, created_at",
        [username, firstName, lastName, email, bcryptedPassword, phone, guid]
      );
      const user = dbUser.rows[0];
      res.status(200).json(user);
      // console.log(dbUser);

      // console.log(user);
    }
  } catch (error) {
    console.error(error);
    res.status(getErrorStatusCode(error)).send({
      message: getErrorMessage(error),
    });
  }
};

//Find user by Username
const findUserByUsername = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const username = req.params.username;

    const dbUser = await User.findOne(username);
    // const dbUser = (await pool.query("SELECT * from users WHERE username = $1", [username] )).rows[0];
    // if(!dbUser){
    //     throw new Error("User not available.");
    // }else{
    //     res.json(dbUser);
    // }
    res.json(dbUser);
  } catch (error) {
    console.error(error);
    res.status(getErrorStatusCode(error)).send({
      message: getErrorMessage(error),
    });
    // next(error.message);
  }
};

//Update User
const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const username = req.params.username;

    //Doesn't all action to other user other than the authorized user.

    if (req.dbUser.username != username) {
      let error = new ErrorHandler(401, "Unauthorized action!");
      throw error;
    }
    //Checks if the username is available and is not deleted.
    const dbUser = (
      await pool.query(
        "SELECT * from users WHERE username = $1 AND deleted_at IS NULL",
        [username]
      )
    ).rows[0];
    if (!dbUser) {
      throw new ErrorHandler(404, "User not available.");
    } else {
      // Checks if the username is already taken and is not deleted.

      const user = req.body;
      if (
        (
          await pool.query(
            "SELECT * FROM users WHERE username = $1 AND deleted_at IS NULL",
            [user.username]
          )
        ).rows[0]
      ) {
        throw new ErrorHandler(409, "Username already taken.");

        // Checks if the email is already taken and is not deleted.
      } else if (
        (
          await pool.query(
            "SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL",
            [user.email]
          )
        ).rows[0]
      ) {
        throw new ErrorHandler(409, "Email already in use.");
      } else {
        // Only updates the fields which are provided in the request body else the previous data from the database is used.
        dbUser.username = !user.username ? dbUser.username : user.username;

        dbUser.first_name = !user.firstName
          ? dbUser.first_name
          : user.firstName;
        dbUser.last_name = !user.lastName ? dbUser.last_name : user.lastName;
        dbUser.email = !user.email ? dbUser.email : user.email;
        dbUser.password = !user.password
          ? dbUser.password
          : bcrypt.hashSync(user.password, 8);
        dbUser.phone = !user.phone ? dbUser.phone : user.phone;

        const updatedUser = (
          await pool.query(
            "UPDATE users SET username = $1, first_name = $2, last_name = $3, email = $4, password = $5, phone = $6, updated_at = NOW() RETURNING *",
            [
              dbUser.username,
              dbUser.first_name,
              dbUser.last_name,
              dbUser.email,
              dbUser.password,
              dbUser.phone,
            ]
          )
        ).rows[0];

        console.error(updatedUser);
        res.json(updatedUser);
      }
    }
  } catch (error) {
    res.status(getErrorStatusCode(error)).send({
      message: getErrorMessage(error),
    });
  }
};

//Delete User
const deleteUserByUsername = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const username = req.params.username;
    if (req.dbUser.username === username) {
      let error = new ErrorHandler(401, "Unauthorized action!");
      throw error;
    }
    const dbUser = (
      await pool.query(
        "UPDATE users SET deleted_at = NOW() WHERE username = $1 AND deleted_at IS NULL RETURNING *",
        [username]
      )
    ).rows[0];
    if (!dbUser) {
      throw new ErrorHandler(409, "Username not found.");
    } else {
      res.json(dbUser);
    }
  } catch (error) {
    console.log(error);
    res.status(getErrorStatusCode(error)).send({
      message: getErrorMessage(error),
    });
  }
};

export default {
  createUser,
  getAllUsers,
  findUserByUsername,
  deleteUserByUsername,
  updateUser,
};
