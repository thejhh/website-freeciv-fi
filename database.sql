/* MySQL database */

/* Open Games */
CREATE TABLE `game` (
	game_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	name      VARCHAR(255) NOT NULL DEFAULT '',
	type      VARCHAR(255) NOT NULL DEFAULT '',
	start_time  TIMESTAMP NOT NULL DEFAULT 0,
	end_time    TIMESTAMP NOT NULL DEFAULT 0,
	description TEXT DEFAULT '',
	PRIMARY KEY(game_id)) CHARACTER SET utf8;

/* Registerated emails */
CREATE TABLE `ilmo` (
	ilmo_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	game_id     INT UNSIGNED NOT NULL DEFAULT 0,
	email       VARCHAR(255) NOT NULL DEFAULT '',
	PRIMARY KEY(ilmo_id)) CHARACTER SET utf8;

/* EOF */
