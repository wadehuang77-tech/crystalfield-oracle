namespace VedAstro.SelfHost;

public sealed record Position(
    string Name,
    double? Longitude,
    string? Sign,
    double? Degree,
    int? House,
    string? Nakshatra,
    int? Pada,
    string? Raw);

public sealed record DashaPeriod(
    int Level,
    string Lord,
    string? ParentLord,
    DateTimeOffset Start,
    DateTimeOffset End);

public sealed record DashaChart(
    string Mahadasha,
    string Antardasha,
    DateTimeOffset MahadashaStart,
    DateTimeOffset MahadashaEnd,
    DateTimeOffset AntardashaStart,
    DateTimeOffset AntardashaEnd,
    IReadOnlyList<DashaPeriod> Periods);

public sealed record D1Chart(
    Position Ascendant,
    IReadOnlyList<Position> Planets,
    IReadOnlyDictionary<string, HousePosition> Houses);

public sealed record HousePosition(double Begin, double Mid, double End, string Sign);

public sealed class CalculationBusyException : Exception
{
}
