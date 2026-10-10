-- ONLY for isolated local D1 tests. No real payment, customer, secret or live entitlement.
INSERT OR IGNORE INTO profiles(id, email) VALUES ('maya-test-paid', 'maya-paid@example.test');
INSERT OR IGNORE INTO profiles(id, email) VALUES ('maya-test-free', 'maya-free@example.test');
INSERT OR IGNORE INTO profiles(id, email) VALUES ('maya-test-other', 'maya-other@example.test');
INSERT OR IGNORE INTO orders(id, merchant_trade_no, user_id, email, item_type, item_id, item_name, amount, status, paid_at)
VALUES ('maya-test-basic', 'MAYATESTBASIC', 'maya-test-paid', 'maya-paid@example.test', 'maya_mock', 'MAYA_BASIC_199', 'Mock basic report', 199, 'paid', '2020-01-01T00:00:00Z');
INSERT OR IGNORE INTO orders(id, merchant_trade_no, user_id, email, item_type, item_id, item_name, amount, status, paid_at)
VALUES ('maya-test-full', 'MAYATESTFULL', 'maya-test-paid', 'maya-paid@example.test', 'maya_mock', 'MAYA_FULL_499', 'Mock full report', 499, 'paid', '2020-01-01T00:00:00Z');
INSERT OR IGNORE INTO orders(id, merchant_trade_no, user_id, email, item_type, item_id, item_name, amount, status, paid_at)
VALUES ('maya-test-relationship', 'MAYATESTRELATIONSHIP', 'maya-test-paid', 'maya-paid@example.test', 'maya_mock', 'MAYA_RELATIONSHIP_699', 'Mock relationship report', 699, 'paid', '2020-01-01T00:00:00Z');
INSERT OR IGNORE INTO maya_entitlements(id, user_id, product_code, order_id, status, source, starts_at)
VALUES ('maya-test-ent-basic', 'maya-test-paid', 'MAYA_BASIC_199', 'maya-test-basic', 'active', 'local_mock', '2020-01-01T00:00:00Z');
INSERT OR IGNORE INTO maya_entitlements(id, user_id, product_code, order_id, status, source, starts_at)
VALUES ('maya-test-ent-full', 'maya-test-paid', 'MAYA_FULL_499', 'maya-test-full', 'active', 'local_mock', '2020-01-01T00:00:00Z');
INSERT OR IGNORE INTO maya_entitlements(id, user_id, product_code, order_id, status, source, starts_at)
VALUES ('maya-test-ent-relationship', 'maya-test-paid', 'MAYA_RELATIONSHIP_699', 'maya-test-relationship', 'active', 'local_mock', '2020-01-01T00:00:00Z');
