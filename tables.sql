DROP TABLE IF EXISTS user_room_association CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_actions CASCADE;
DROP TABLE IF EXISTS ai_chat_boxes CASCADE;
DROP TABLE IF EXISTS ai_chat_messages CASCADE;
DROP TABLE IF EXISTS topics CASCADE;


CREATE TABLE users (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    username TEXT NOT NULL,
    auth_user_id UUID REFERENCES auth.users (id), -- Foreign key reference
    is_bot BOOLEAN DEFAULT FALSE
);
CREATE TABLE
  rooms (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    NAME TEXT NOT NULL,
    info JSONB -- JSONB data type for storing additional room information
  );
CREATE TABLE user_actions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    room_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    action TEXT NOT NULL,
    data JSONB -- JSONB data type for storing additional action data
);
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE user_room_association (
    user_id BIGINT REFERENCES users(id),
    room_id BIGINT REFERENCES rooms(id),
    PRIMARY KEY (user_id, room_id)
);
CREATE TABLE IF NOT EXISTS ai_chat_boxes (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    room_id BIGINT NOT NULL REFERENCES rooms(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    ai_chat_box_id BIGINT NOT NULL REFERENCES ai_chat_boxes(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS
  topics (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
