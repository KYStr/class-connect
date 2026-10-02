-- Calendar notes (what to bring) and a phone-calendar reminder preset.
alter table events
  add column if not exists note text,
  add column if not exists remind text not null default 'morning';

alter table events drop constraint if exists events_remind_check;
alter table events
  add constraint events_remind_check check (remind in ('none', 'eve', 'morning'));
