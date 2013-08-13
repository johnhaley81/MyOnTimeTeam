using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Security.Cryptography;
using System.IO;
using System.Text;
using System.Data.SqlClient;
using System.Web.Configuration;
using System.Text.RegularExpressions;

namespace MyOnTimeTeam
{
    public class DatabaseHelper
    {
        public static byte[] getKeyb()
        {
            return WebConfigurationManager.AppSettings["DatabaseKey"].ToString().Split(';').Select(byte.Parse).ToArray();
        }

        public static byte[] getIvb()
        {
            return WebConfigurationManager.AppSettings["DatabaseInitializationVector"].ToString().Split(';').Select(byte.Parse).ToArray();
        }

        public static string Encrypt(string plainText)
        {
            byte[] keyb = getKeyb();
            byte[] ivb = getIvb();

            byte[] encodedBytes;
            using (RijndaelManaged rv = new RijndaelManaged())
            {
                using (MemoryStream memoryStream = new MemoryStream(plainText.Length + 0x100))
                {
                    using (ICryptoTransform encryptor = rv.CreateEncryptor(keyb, ivb))
                    {
                        using (CryptoStream cryptoStream = new CryptoStream(memoryStream, encryptor, CryptoStreamMode.Write))
                        {
                            byte[] p = Encoding.UTF8.GetBytes(plainText);
                            cryptoStream.Write(p, 0, p.Length);
                            cryptoStream.FlushFinalBlock();
                            encodedBytes = memoryStream.ToArray();
                        }
                    }
                }
            }
            return Convert.ToBase64String(encodedBytes);
        }

        public static string Decrypt(string cipherText)
        {
            byte[] keyb = getKeyb();
            byte[] ivb = getIvb();

            if (string.IsNullOrEmpty(cipherText))
                return string.Empty;

            byte[] encodedBytes = Convert.FromBase64String(cipherText);
            byte[] initialText = new byte[encodedBytes.Length];

            using (RijndaelManaged rv = new RijndaelManaged())
            {
                using (MemoryStream memoryStream = new MemoryStream(encodedBytes))
                {
                    using (ICryptoTransform decryptor = rv.CreateDecryptor(keyb, ivb))
                    {
                        using (CryptoStream cryptoStream = new CryptoStream(memoryStream, decryptor, CryptoStreamMode.Read))
                        {
                            cryptoStream.Read(initialText, 0, initialText.Length);
                        }
                    }
                }
            }

            // get string from bytes, and remove extra \0
            string decrypted = Encoding.UTF8.GetString(initialText);
            if (decrypted.Length > 0)
                decrypted = decrypted.Replace("\0", string.Empty);
            return decrypted;
        }

        public static bool LogLogin(string name, string email, string url, string logintime)
        {
            //TODO: encryption
            name = Encrypt(name);
            email = Encrypt(email);
            url = Encrypt(url);
            logintime = Encrypt(logintime);

            SqlTransaction transaction;

            using (SqlConnection connection = new SqlConnection(WebConfigurationManager.AppSettings["ConnectionString"]))
            {
                try
                {
                    connection.Open();
                }
                catch (Exception)
                {
                    return false;
                }
                SqlCommand command = connection.CreateCommand();

                transaction = connection.BeginTransaction("Login");
                command.Connection = connection;
                command.Transaction = transaction;
                try
                {
                    command.CommandText = string.Format("EXEC [dbo].[LogLogin] '{0}', '{1}', '{2}', '{3}'", name, email, url, logintime);
                    command.ExecuteNonQuery();
                    transaction.Commit();
                    return true;
                }
                catch (Exception)
                {
                    try
                    {
                        transaction.Rollback();
                        return false;
                    }
                    catch (Exception)
                    {
                        return false;
                    }
                }
            }
        }

        public static void LoadTablesAndSprocs()
        {
            //load all files and produce a single string
            DirectoryInfo SqlDir = new DirectoryInfo(HttpContext.Current.Server.MapPath("/DatabaseStuff/"));
            FileInfo[] SqlFiles = null;
            try
            {
                SqlFiles = SqlDir.GetFiles();
            }
            catch (UnauthorizedAccessException)
            {
                //this fires if the program does not have permission to access the file for some reason
            }
            catch (DirectoryNotFoundException)
            {
                //not sure how you would reach this
            }

            if (SqlFiles == null)//something is broken if this is still true
            {
                return;
            }

            string scripts = "";

            foreach (FileInfo fi in SqlFiles)
            {
                try
                {
                    //open a file and append its contents to scripts
                    using (FileStream fs = new FileStream(fi.DirectoryName + "\\" + fi.Name, FileMode.Open))
                    {
                        using (StreamReader sr = new StreamReader(fs))
                        {
                            scripts = scripts + sr.ReadToEnd() + "\n";
                        }
                    }
                }
                catch (Exception) { }
            }

            string[] commands = Regex.Split(scripts, "\r\n[\t ]*GO");

            SqlCommand cmd;

            foreach (string commandtext in commands)
            {
                cmd = new SqlCommand(String.Empty, new SqlConnection(WebConfigurationManager.AppSettings["ConnectionString"]));
                try
                {
                    cmd.Connection.Open();

                    if (commandtext.Trim() == string.Empty)
                    {
                        continue;
                    }
                    cmd.CommandText = commandtext;
                    cmd.ExecuteNonQuery();
                    cmd.Connection.Close();
                }
                catch (Exception) { }
            }
        }
    }
}