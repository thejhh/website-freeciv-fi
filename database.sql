/* MySQL database */

/* Games */
CREATE TABLE `game` (
	game_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	name      VARCHAR(255) NOT NULL DEFAULT '',
	type      VARCHAR(255) NOT NULL DEFAULT '',
	start_time  TIMESTAMP NOT NULL DEFAULT 0,
	end_time    TIMESTAMP NOT NULL DEFAULT 0,
	description TEXT NOT NULL DEFAULT '',
	PRIMARY KEY(game_id)) CHARACTER SET utf8;

/* Users */
CREATE TABLE `user` (
	user_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	email       VARCHAR(255) NOT NULL DEFAULT '',
	password    VARCHAR(255) NOT NULL DEFAULT '',
	PRIMARY KEY(user_id)) CHARACTER SET utf8;

/* Players */
CREATE TABLE `player` (
	player_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	user_id     INT UNSIGNED NOT NULL DEFAULT 0,
	game_id     INT UNSIGNED NOT NULL DEFAULT 0,
	name        VARCHAR(255) NOT NULL DEFAULT '',
	nation      VARCHAR(255) NOT NULL DEFAULT '',
	UNIQUE KEY `user_game_key` (user_id,game_id),
	UNIQUE KEY `game_nation_key` (game_id,nation),
	UNIQUE KEY `game_name_key` (game_id,name),
	PRIMARY KEY(player_id)) CHARACTER SET utf8;

/* EOF */
