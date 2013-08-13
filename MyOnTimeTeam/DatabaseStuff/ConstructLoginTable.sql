IF (NOT (EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'LoginData')))
BEGIN
	CREATE TABLE LoginData
	(
		Name nvarchar(255),
		Email nvarchar(255),
		Url nvarchar(255),
		LoginTime nvarchar(255)
	)
END