/* MySQL database */

/* Games */
CREATE TABLE `game` (
	game_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	tag       VARCHAR(255) UNIQUE NOT NULL DEFAULT '',
	name      VARCHAR(255) NOT NULL DEFAULT '',
	type      VARCHAR(255) NOT NULL DEFAULT '',
	start_time  TIMESTAMP NOT NULL DEFAULT 0,
	end_time    TIMESTAMP NOT NULL DEFAULT 0,
	description TEXT NOT NULL DEFAULT '',
	PRIMARY KEY(game_id)) CHARACTER SET utf8;

/* Users */
CREATE TABLE `user` (
	user_id     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	email       VARCHAR(255) UNIQUE NOT NULL DEFAULT '',
	name        VARCHAR(255) UNIQUE,
	realname    VARCHAR(255) NOT NULL DEFAULT '',
	password    VARCHAR(255) NOT NULL DEFAULT '',
	smf_password VARCHAR(255) NOT NULL DEFAULT '',
	wiki_password VARCHAR(255) NOT NULL DEFAULT '',
	PRIMARY KEY(user_id)) CHARACTER SET utf8;

/* Registrations */
CREATE TABLE `reg` (
	reg_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	game_id     INT UNSIGNED NOT NULL DEFAULT 0,
	user_id     INT UNSIGNED NOT NULL DEFAULT 0,
    number      INT UNSIGNED NOT NULL DEFAULT 0,
	UNIQUE KEY `user_game_key` (user_id,game_id),
	UNIQUE KEY `game_number_key` (game_id,number),
	PRIMARY KEY(reg_id)) CHARACTER SET utf8;

/* Players */
CREATE TABLE `player` (
	player_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	game_id     INT UNSIGNED NOT NULL DEFAULT 0,
	reg_id      INT UNSIGNED UNIQUE NOT NULL DEFAULT 0,
	name        VARCHAR(255) NOT NULL DEFAULT '',
	nation      VARCHAR(255) NOT NULL DEFAULT '',
	UNIQUE KEY `game_nation_key` (game_id,nation),
	UNIQUE KEY `game_name_key` (game_id,name),
	PRIMARY KEY(player_id)) CHARACTER SET utf8;

/* Freeciv gameserver table */
CREATE TABLE auth (
	auth_id     int(11) NOT NULL auto_increment,
	game_id     INT UNSIGNED NOT NULL DEFAULT 0,
	user_id     INT UNSIGNED NOT NULL DEFAULT 0,
	name varchar(32) default NULL,
	password varchar(255) default NULL,
	email varchar(255) default NULL,
	createtime int(11) default NULL,
	accesstime int(11) default NULL,
	address varchar(255) default NULL,
	createaddress varchar(15) default NULL,
	logincount int(11) default '0',
	PRIMARY KEY  (auth_id),
	UNIQUE KEY game_name_key (game_id,name),
	UNIQUE KEY game_user_key (game_id,user_id)
) CHARACTER SET utf8;

/* Freeciv server login log */
CREATE TABLE loginlog (
   loginlog_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
   name    VARCHAR(255) default NULL,
   logintime   int(11) default NULL,
   address     VARCHAR(255) default NULL,
   succeed     enum('S','F') default 'S',
   PRIMARY KEY (loginlog_id)) CHARACTER SET utf8;

/* EOF */
