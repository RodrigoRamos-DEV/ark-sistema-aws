-- Add client_id column to feira_produtos table
ALTER TABLE feira_produtos 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_feira_produtos_client_id ON feira_produtos(client_id);