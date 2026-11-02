using System.Globalization;
using System.Text.RegularExpressions;

namespace VedAstro.SelfHost;

public sealed record BirthData(
    string? Date,
    string? Time,
    string? Timezone,
    double Latitude,
    double Longitude,
    string? LocationName,
    string? Ayanamsa);

public static partial class BirthDataValidator
{
    private static readonly Regex OffsetPattern = new(
        @"^(?<sign>[+-])(?<hours>\d{2}):(?<minutes>\d{2})$",
        RegexOptions.CultureInvariant | RegexOptions.Compiled);

    public static bool TryValidate(BirthData input, out string? error)
    {
        error = null;
        if (input.Date is null || !DateOnly.TryParseExact(
                input.Date,
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out _))
        {
            error = "date must use yyyy-MM-dd.";
            return false;
        }

        if (input.Time is null || !TimeOnly.TryParseExact(
                input.Time,
                "HH:mm",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out _))
        {
            error = "time must use HH:mm.";
            return false;
        }

        if (!IsValidOffset(input.Timezone))
        {
            error = "timezone must be a valid UTC offset in ±HH:mm format.";
            return false;
        }

        if (!double.IsFinite(input.Latitude) || input.Latitude is < -90 or > 90
            || !double.IsFinite(input.Longitude) || input.Longitude is < -180 or > 180)
        {
            error = "latitude and longitude are outside valid ranges.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(input.LocationName) || input.LocationName.Length > 160)
        {
            error = "locationName must contain 1 to 160 characters.";
            return false;
        }

        if (input.Ayanamsa is not (null or "Lahiri"))
        {
            error = "Only Lahiri ayanamsa is supported by this PoC.";
            return false;
        }

        return true;
    }

    private static bool IsValidOffset(string? offset)
    {
        if (offset is null) return false;
        var match = OffsetPattern.Match(offset);
        if (!match.Success) return false;
        var hours = int.Parse(match.Groups["hours"].Value, CultureInfo.InvariantCulture);
        var minutes = int.Parse(match.Groups["minutes"].Value, CultureInfo.InvariantCulture);
        return hours <= 14 && minutes <= 59 && (hours != 14 || minutes == 0);
    }
}
