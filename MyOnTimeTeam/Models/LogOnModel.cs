using System.ComponentModel.DataAnnotations;

namespace MyOnTimeTeam.Models
{
    public class LogOnModel
    {
        [Required]
        [DataType(DataType.Url)]
        [Display(Name = "OnTime Url")]
        public string OnTimeUrl { get; set; }
    }
}