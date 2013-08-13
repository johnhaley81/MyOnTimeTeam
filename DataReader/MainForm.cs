using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Forms;

namespace DataReader
{
    public partial class MainForm : Form
    {
        public MainForm()
        {
            InitializeComponent();
        }

        private void EncryptButton_Click(object sender, EventArgs e)
        {
            DataBox.Text = Encrypt(DataBox.Text);
            ErrorLabel.Text = "";
        }

        private void DecryptButton_Click(object sender, EventArgs e)
        {
            try
            {
                DataBox.Text = Decrypt(DataBox.Text);
                ErrorLabel.Text = "";
            }
            catch (FormatException)
            {
                ErrorLabel.Text = "Input not a valid base64 string";
            }
            catch (CryptographicException)
            {
                ErrorLabel.Text = "Input not a valid Rijndael ciphertext (malformed block?)";
            }
        }

        public static string Encrypt(string plainText)
        {
            byte[] encodedBytes;
            using (RijndaelManaged rv = new RijndaelManaged())
            {
                using (MemoryStream memoryStream = new MemoryStream(plainText.Length + 0x100))
                {
                    using (ICryptoTransform encryptor = rv.CreateEncryptor(Keys.keyb, Keys.ivb))
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
            byte[] encodedBytes = Convert.FromBase64String(cipherText);
            byte[] initialText = new byte[encodedBytes.Length];

            using (RijndaelManaged rv = new RijndaelManaged())
            {
                using (MemoryStream memoryStream = new MemoryStream(encodedBytes))
                {
                    using (ICryptoTransform decryptor = rv.CreateDecryptor(Keys.keyb, Keys.ivb))
                    {
                        using (CryptoStream cryptoStream = new CryptoStream(memoryStream, decryptor, CryptoStreamMode.Read))
                        {
                            cryptoStream.Read(initialText, 0, initialText.Length);
                        }
                    }
                }
            }
            StringBuilder sb = new StringBuilder(initialText.Length);

            for (int i = 0; i < initialText.Length; i++)
            {
                if (initialText[i] == '\0')
                    break;
                sb.Append((char)initialText[i]);
            }

            return sb.ToString();
        }
    }
}