-- 利用記録と集計を同時に更新するファンクション
create or replace function record_usage(
    p_user_id text,
    p_date date,
    p_audio_duration integer,
    p_whisper_cost numeric,
    p_chatgpt_cost numeric
) returns void as $$
begin
    -- 利用記録の挿入
    insert into usage_records (
        user_id, date, audio_duration, 
        whisper_cost, chatgpt_cost, total_cost
    ) values (
        p_user_id, p_date, p_audio_duration,
        p_whisper_cost, p_chatgpt_cost,
        p_whisper_cost + p_chatgpt_cost
    );

    -- 日次集計の更新（upsert）
    insert into daily_usage (
        date, total_whisper_cost, total_chatgpt_cost, total_cost
    ) values (
        p_date, p_whisper_cost, p_chatgpt_cost,
        p_whisper_cost + p_chatgpt_cost
    )
    on conflict (date) do update set
        total_whisper_cost = daily_usage.total_whisper_cost + EXCLUDED.total_whisper_cost,
        total_chatgpt_cost = daily_usage.total_chatgpt_cost + EXCLUDED.total_chatgpt_cost,
        total_cost = daily_usage.total_cost + EXCLUDED.total_cost,
        last_updated = now();
end;
$$ language plpgsql; 