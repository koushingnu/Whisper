-- daily_usageテーブルの作成
create table if not exists daily_usage (
    date date primary key,
    total_whisper_cost numeric(10, 2) not null default 0, -- Whisper API合計（円）
    total_chatgpt_cost numeric(10, 2) not null default 0, -- ChatGPT API合計（円）
    total_cost numeric(10, 2) not null default 0, -- 日合計（円）
    last_updated timestamp with time zone default now()
); 