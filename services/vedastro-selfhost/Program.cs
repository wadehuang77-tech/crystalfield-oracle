using System.Text.Json;
using System.Text.Json.Serialization;
using VedAstro.SelfHost;

var builder = WebApplication.CreateBuilder(args);
if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ASPNETCORE_URLS"))
    && string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ASPNETCORE_HTTP_PORTS")))
{
    builder.WebHost.UseUrls("http://127.0.0.1:8080");
}
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 8 * 1024);
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddSingleton<VedAstroAdapter>();

var app = builder.Build();
app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    engine = "VedAstro",
    mode = "self-hosted",
}));
app.MapPost("/api/chart", () => UnsupportedCalculation("A complete chart requires native D9 and D10 calculators."));
app.MapPost("/api/d1", (HttpContext context, VedAstroAdapter adapter) =>
    HandleCalculation(context, adapter, adapter.CalculateD1Async));
app.MapPost("/api/d9", () => UnsupportedCalculation("The pinned VedAstro Library source does not expose a native D9 sign-map calculator."));
app.MapPost("/api/d10", () => UnsupportedCalculation("The pinned VedAstro Library source does not expose a native D10 sign-map calculator."));
app.MapPost("/api/dasha", (HttpContext context, VedAstroAdapter adapter) =>
    HandleCalculation(context, adapter, adapter.CalculateDashaAsync));

app.Run();

static async Task<IResult> HandleCalculation<T>(
    HttpContext context,
    VedAstroAdapter adapter,
    Func<BirthData, CancellationToken, Task<T>> calculate)
{
    var requestId = Guid.NewGuid().ToString("N");
    BirthData? input;
    try
    {
        input = await JsonSerializer.DeserializeAsync<BirthData>(
            context.Request.Body,
            new JsonSerializerOptions(JsonSerializerDefaults.Web),
            context.RequestAborted);
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { error = "Request body must be valid JSON.", code = "INVALID_JSON" });
    }
    catch (BadHttpRequestException)
    {
        return Results.BadRequest(new { error = "Request body is invalid or exceeds the size limit.", code = "INVALID_BODY" });
    }

    if (input is null)
    {
        return Results.BadRequest(new
        {
            error = "Request body is required.",
            code = "INVALID_BIRTH_DATA",
        });
    }

    if (!BirthDataValidator.TryValidate(input, out var validationError))
    {
        return Results.BadRequest(new
        {
            error = validationError,
            code = "INVALID_BIRTH_DATA",
        });
    }

    try
    {
        return Results.Ok(await calculate(input, context.RequestAborted));
    }
    catch (CalculationBusyException)
    {
        return Results.Json(
            new { error = "Calculation capacity is temporarily unavailable.", code = "CALCULATION_BUSY", requestId },
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (TimeoutException)
    {
        return Results.Json(
            new { error = "Calculation timed out.", code = "CALCULATION_TIMEOUT", requestId },
            statusCode: StatusCodes.Status504GatewayTimeout);
    }
    catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
    {
        return Results.Empty;
    }
    catch (Exception exception)
    {
        appLogger(context).LogError(exception, "VedAstro calculation failed. RequestId={RequestId}", requestId);
        return Results.Json(
            new { error = "Calculation failed.", code = "CALCULATION_FAILED", requestId },
            statusCode: StatusCodes.Status500InternalServerError);
    }
}

static ILogger appLogger(HttpContext context) =>
    context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("VedAstro.SelfHost");

static IResult UnsupportedCalculation(string reason) =>
    Results.Json(
        new { error = reason, code = "UNSUPPORTED_CALCULATION" },
        statusCode: StatusCodes.Status501NotImplemented);

public partial class Program
{
}
