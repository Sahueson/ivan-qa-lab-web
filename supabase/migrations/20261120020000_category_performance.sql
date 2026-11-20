-- Permite la categoría 'performance' (Rendimiento) en tools, para JMeter.
alter table tools drop constraint if exists tools_category_check;
alter table tools add constraint tools_category_check
  check (category in ('front', 'bdd', 'api', 'mobile', 'performance'));
