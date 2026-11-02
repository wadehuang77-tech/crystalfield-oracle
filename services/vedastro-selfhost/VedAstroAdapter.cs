using System.Globalization;
using System.Reflection;
using Newtonsoft.Json.Linq;
using VedAstro.Library;
using VedTime = VedAstro.Library.Time;

namespace VedAstro.SelfHost;

public sealed class VedAstroAdapter
{
    private static readonly string[] PlanetNames =
    [
        "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu",
    ];

    private readonly SemaphoreSlim calculationGate = new(1, 1);

    static VedAstroAdapter()
    {
        Calculate.Ayanamsa = (int)Ayanamsa.LAHIRI;
    }

    public Task<D1Chart> CalculateD1Async(BirthData input, CancellationToken cancellationToken) =>
        RunSerialized(input, cancellationToken, CalculateD1);

    public Task<DashaChart> CalculateDashaAsync(BirthData input, CancellationToken cancellationToken) =>
        RunSerialized(input, cancellationToken, CalculateDasha);

    private async Task<T> RunSerialized<T>(
        BirthData input,
        CancellationToken cancellationToken,
        Func<BirthData, T> calculation)
    {
        if (!await calculationGate.WaitAsync(TimeSpan.FromSeconds(2), cancellationToken))
        {
            throw new CalculationBusyException();
        }

        var calculationTask = Task.Run(() =>
        {
            try
            {
                return calculation(input);
            }
            finally
            {
                calculationGate.Release();
            }
        });

        return await calculationTask.WaitAsync(TimeSpan.FromSeconds(15), cancellationToken);
    }

    private static D1Chart CalculateD1(BirthData input)
    {
        var birth = CreateBirthTime(input);
        var longitudes = Calculate.AllPlanetLongitude(birth);
        var houses = House.AllHouses
            .Select(houseName => Calculate.HouseLongitude(houseName, birth))
            .ToArray();
        var houseSigns = houses.ToDictionary(
            house => house.GetHouseName(),
            house => Calculate.ZodiacSignAtLongitude(house.GetMiddleLongitude()));
        var moonConstellation = Calculate.MoonConstellation(birth);
        return BuildD1(birth, longitudes, houses, houseSigns, moonConstellation);
    }

    private static DashaChart CalculateDasha(BirthData input)
    {
        var birth = CreateBirthTime(input);
        return BuildDasha(input, birth);
    }

    private static VedTime CreateBirthTime(BirthData input)
    {
        var date = DateOnly.ParseExact(input.Date!, "yyyy-MM-dd", CultureInfo.InvariantCulture);
        var time = TimeOnly.ParseExact(input.Time!, "HH:mm", CultureInfo.InvariantCulture);
        var stdTime = $"{time:HH:mm} {date:dd/MM/yyyy} {input.Timezone}";
        var location = new GeoLocation(input.LocationName!.Trim(), input.Longitude, input.Latitude);
        return new VedTime(stdTime, location);
    }

    private static D1Chart BuildD1(
        VedTime birth,
        IReadOnlyList<PlanetLongitude> longitudes,
        IReadOnlyList<House> houses,
        IReadOnlyDictionary<HouseName, ZodiacSign> houseSigns,
        object moonConstellation)
    {
        var planetsByName = longitudes.ToDictionary(
            entry => entry.GetPlanetName().ToString(),
            entry => entry.GetPlanetLongitude());
        RequireAll(PlanetNames, planetsByName.Keys, "D1 longitude");

        var housesByName = houses.ToDictionary(entry => entry.GetHouseName());
        var housesOutput = new Dictionary<string, HousePosition>(StringComparer.Ordinal);
        foreach (var houseName in Enumerable.Range(1, 12).Select(index => $"House{index}"))
        {
            if (!Enum.TryParse<HouseName>(houseName, out var houseKey)
                || !housesByName.TryGetValue(houseKey, out var house)
                || !houseSigns.TryGetValue(houseKey, out var sign))
            {
                throw new InvalidOperationException($"VedAstro returned incomplete D1 data for {houseName}.");
            }

            housesOutput.Add(houseName, new HousePosition(
                NormalizeLongitude(house.GetBeginLongitude().TotalDegrees),
                NormalizeLongitude(house.GetMiddleLongitude().TotalDegrees),
                NormalizeLongitude(house.GetEndLongitude().TotalDegrees),
                sign.GetSignName().ToString()));
        }

        var ascendantHouse = housesByName[HouseName.House1];
        var ascendantLongitude = NormalizeLongitude(ascendantHouse.GetMiddleLongitude().TotalDegrees);
        var ascendantSign = houseSigns[HouseName.House1].GetSignName().ToString();
        var ascendant = new Position(
            "Ascendant",
            ascendantLongitude,
            ascendantSign,
            housesByName[HouseName.House1].GetMiddleLongitude().TotalDegrees % 30,
            1,
            null,
            null,
            ascendantHouse.ToString());

        var positions = new List<Position>(PlanetNames.Length);
        foreach (var planetName in PlanetNames)
        {
            var longitude = planetsByName[planetName];
            var planet = PlanetName.Parse(planetName);
            var zodiacSign = Calculate.PlanetZodiacSign(planet, birth);
            var houseName = houses
                .Where(entry => entry.IsLongitudeInHouseRange(longitude))
                .Select(entry => entry.GetHouseName())
                .Cast<HouseName?>()
                .FirstOrDefault();
            int? houseNumber = houseName is null
                ? null
                : int.Parse(houseName.Value.ToString().AsSpan("House".Length), CultureInfo.InvariantCulture);
            if (houseNumber is null)
            {
                throw new InvalidOperationException($"VedAstro returned no D1 house for {planetName}.");
            }
            var pada = planetName == "Moon" ? (int?)ReadNativeValue(moonConstellation, "GetQuarter") : null;
            var nakshatra = planetName == "Moon" ? ReadNativeValue(moonConstellation, "GetConstellationName")?.ToString() : null;
            positions.Add(new Position(
                planetName,
                NormalizeLongitude(longitude.TotalDegrees),
                zodiacSign.GetSignName().ToString(),
                zodiacSign.GetDegreesInSign().TotalDegrees,
                houseNumber,
                nakshatra,
                pada,
                longitude.ToString()));
        }

        return new D1Chart(ascendant, positions, housesOutput);
    }

    private static object? ReadNativeValue(object source, string methodName)
    {
        var method = source.GetType().GetMethod(methodName, Type.EmptyTypes);
        if (method is null)
        {
            throw new InvalidOperationException($"VedAstro returned a native value without {methodName}().");
        }
        return method.Invoke(source, null);
    }

    private static DashaChart BuildDasha(BirthData input, VedTime birth)
    {
        var offset = DateTimeOffset.ParseExact(
            $"2000-01-01T00:00:00{input.Timezone}",
            "yyyy-MM-dd'T'HH:mm:sszzz",
            CultureInfo.InvariantCulture).Offset;
        var asOf = DateTimeOffset.UtcNow;
        var location = new GeoLocation(input.LocationName!.Trim(), input.Longitude, input.Latitude);
        var rangeStart = asOf.ToOffset(offset);
        var rangeEnd = rangeStart.AddYears(10);
        var startTime = new VedTime($"{rangeStart:HH:mm dd/MM/yyyy} {input.Timezone}", location);
        var endTime = new VedTime($"{rangeEnd:HH:mm dd/MM/yyyy} {input.Timezone}", location);
        var rawPeriods = Calculate.DasaAtRange(birth, startTime, endTime, levels: 2, precisionHours: 168);
        var periods = ReadDashaPeriods(rawPeriods);

        var currentMaha = periods.FirstOrDefault(item =>
            item.Level == 1 && item.Start <= asOf && asOf < item.End)
            ?? throw new InvalidOperationException("VedAstro returned no active Mahadasha for the current date.");
        var currentAntar = periods.FirstOrDefault(item =>
            item.Level == 2
            && item.ParentLord == currentMaha.Lord
            && item.Start <= asOf
            && asOf < item.End)
            ?? throw new InvalidOperationException("VedAstro returned no active Antardasha for the current date.");

        return new DashaChart(
            currentMaha.Lord,
            currentAntar.Lord,
            currentMaha.Start,
            currentMaha.End,
            currentAntar.Start,
            currentAntar.End,
            periods);
    }

    private static IReadOnlyList<DashaPeriod> ReadDashaPeriods(JObject raw)
    {
        var periods = new List<DashaPeriod>();
        foreach (var maha in raw.Properties())
        {
            var mahaLord = ReadDashaText(maha.Value["Lord"], maha.Name);
            var mahaStart = ReadDashaDate(maha.Value["Start"], mahaLord);
            var mahaEnd = ReadDashaDate(maha.Value["End"], mahaLord);
            periods.Add(new DashaPeriod(1, mahaLord, null, mahaStart, mahaEnd));

            if (maha.Value["SubDasas"] is not JObject subDasas) continue;
            foreach (var antar in subDasas.Properties())
            {
                var antarLord = ReadDashaText(antar.Value["Lord"], antar.Name);
                periods.Add(new DashaPeriod(
                    2,
                    antarLord,
                    mahaLord,
                    ReadDashaDate(antar.Value["Start"], antarLord),
                    ReadDashaDate(antar.Value["End"], antarLord)));
            }
        }

        if (periods.Count == 0)
        {
            throw new InvalidOperationException("VedAstro returned no Dasha periods for the requested time range.");
        }

        return periods.OrderBy(item => item.Start).ToArray();
    }

    private static string ReadDashaText(JToken? value, string fallback)
    {
        var text = value?.Value<string>();
        return string.IsNullOrWhiteSpace(text) ? fallback : text;
    }

    private static DateTimeOffset ReadDashaDate(JToken? value, string lord)
    {
        var text = value?.Value<string>();
        if (string.IsNullOrWhiteSpace(text)
            || !DateTimeOffset.TryParseExact(
                text,
                "HH:mm dd/MM/yyyy zzz",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out var parsed))
        {
            throw new InvalidOperationException($"VedAstro returned an invalid Dasha date for {lord}.");
        }

        return parsed;
    }

    private static double NormalizeLongitude(double longitude) => ((longitude % 360) + 360) % 360;

    private static void RequireAll(IEnumerable<string> required, IEnumerable<string> actual, string context)
    {
        var actualSet = actual.ToHashSet(StringComparer.Ordinal);
        var missing = required.Where(name => !actualSet.Contains(name)).ToArray();
        if (missing.Length > 0)
        {
            throw new InvalidOperationException(
                $"VedAstro returned incomplete {context} data: {string.Join(", ", missing)}.");
        }
    }
}
