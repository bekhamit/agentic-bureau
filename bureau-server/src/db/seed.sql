-- Seed data for Credit Bureau MVP
-- Creates two demo agents: Agent A (good credit) and Agent B (bad credit)

-- Agent A: Good credit score, high borrowing limit
INSERT INTO agents (
  wallet_address,
  credit_score,
  total_borrowed,
  total_repaid,
  available_credit
) VALUES (
  '0xAgentA123456789012345678901234567890Ab',
  750,
  0,
  0,
  100
) ON CONFLICT (wallet_address) DO UPDATE SET
  credit_score = EXCLUDED.credit_score,
  available_credit = EXCLUDED.available_credit;

-- Agent B: Bad credit score, low borrowing limit
INSERT INTO agents (
  wallet_address,
  credit_score,
  total_borrowed,
  total_repaid,
  available_credit
) VALUES (
  '0xAgentB123456789012345678901234567890Bb',
  300,
  0,
  0,
  10
) ON CONFLICT (wallet_address) DO UPDATE SET
  credit_score = EXCLUDED.credit_score,
  available_credit = EXCLUDED.available_credit;

-- Display seeded agents
SELECT
  wallet_address,
  credit_score,
  available_credit,
  CASE
    WHEN credit_score >= 650 THEN 'Good Credit'
    WHEN credit_score >= 500 THEN 'Fair Credit'
    ELSE 'Poor Credit'
  END as credit_rating
FROM agents
ORDER BY credit_score DESC;
