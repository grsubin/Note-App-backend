import pool from "../config/db";
import bcrypt from "bcrypt";
import User from "../util/user.db.query";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import {
  ErrorHandler,
  getErrorMessage,
  getErrorStatusCode,
} from "../util/ErrorHandler";

const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dbUser = await User.findOne(req.body.username);

    const passwordIsValid = bcrypt.compareSync(
      req.body.password,
      dbUser.password
    );

    if (!passwordIsValid) {
      let error = new ErrorHandler(401, "Invalid Password!");
      throw error;
    } else {
      const guid = uuidv4();

      const token = crypto.randomBytes(190).toString("base64");

      const userAuthInfo = (
        await pool.query(
          "INSERT INTO user_authentication (user_id, token, created_at, guid) VALUES ($1, $2, NOW(), $3) RETURNING id, token, user_id, guid",
          [dbUser.id, token, guid]
        )
      ).rows[0];

      console.log(userAuthInfo);
      res.status(200).send({
        id: userAuthInfo.id,
        userId: userAuthInfo.user_id,
        username: dbUser.username,
        email: dbUser.email,
        guid: userAuthInfo.guid,
        accessToken: token,
      });
    }
  } catch (error) {
    console.error(error);

    // next(error);
    res.status(getErrorStatusCode(error)).send({
      message: getErrorMessage(error),
    });
  }
};

const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.dbUser.token;
    const tokenInfo = (
      await pool.query(
        "UPDATE user_authentication SET deleted_at = NOW() WHERE token = $1 RETURNING id, user_id, guid, created_at, deleted_at ",
        [token]
      )
    ).rows[0];

    res.status(205).send(tokenInfo);
  } catch (error) {
    console.log(error);
    res.status(getErrorStatusCode(error)).send({
      message: getErrorMessage(error),
    });
  }
};

export default {
  login,
  logout,
};
