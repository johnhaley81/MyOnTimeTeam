IF EXISTS (SELECT * FROM dbo.sysobjects WHERE id=object_id(N'[dbo].[LogLogin]') AND OBJECTPROPERTY(id, N'IsProcedure') = 1)
DROP PROCEDURE [dbo.LogLogin]
GO

CREATE PROCEDURE [dbo].[LogLogin]
(
 @Name [nvarchar](255) = Null
,@Email [nvarchar](255) = Null
,@Url [nvarchar](255) = Null
,@LoginTime [nvarchar](255) = Null
)
AS
	INSERT INTO LoginData VALUES (@Name, @Email, @Url, @LoginTime);
	GO

	GRANT EXECUTE ON [dbo].[LogLogin] TO [public]
	GO