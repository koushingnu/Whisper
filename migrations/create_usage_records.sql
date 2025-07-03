-- usage_recordsテーブルの作成
create table if not exists usage_records (
    id uuid default gen_random_uuid() primary key,
    user_id text not null,
    date date not null,
    audio_duration integer not null, -- 音声の長さ（秒）
    whisper_cost numeric(10, 2) not null, -- Whisper API料金（円）
    chatgpt_cost numeric(10, 2) not null, -- ChatGPT API料金（円）
    total_cost numeric(10, 2) not null, -- 合計料金（円）
    created_at timestamp with time zone default now()
);

-- インデックスの作成
create index if not exists usage_records_date_idx on usage_records(date);
create index if not exists usage_records_user_date_idx on usage_records(user_id, date); 