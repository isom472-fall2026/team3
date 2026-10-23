-- Migration: Add UPDATE policy for drivers on buses
-- Allows drivers to update status of their own bus only
CREATE POLICY "Driver can update own bus status"
ON buses
FOR UPDATE
TO authenticated
USING (tracker_user_id = auth.uid())
WITH CHECK (tracker_user_id = auth.uid());
