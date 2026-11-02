FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY VedAstro.SelfHost.csproj .
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git \
    && rm -rf /var/lib/apt/lists/* \
    && git clone --filter=blob:none --no-checkout --depth 1 https://github.com/VedAstro/VedAstro.git /src/vendor/VedAstro \
    && git -C /src/vendor/VedAstro fetch --depth 1 origin 40763952742f76369a505d8db2e9e9fa67f75d78 \
    && git -C /src/vendor/VedAstro sparse-checkout init --cone \
    && git -C /src/vendor/VedAstro sparse-checkout set Library \
    && git -C /src/vendor/VedAstro checkout --detach 40763952742f76369a505d8db2e9e9fa67f75d78
RUN dotnet restore
COPY . .
RUN git -C vendor/VedAstro apply patches/net10-cache-persistence.patch
RUN dotnet publish -c Release -o /out --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /out .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
USER 65532:65532
ENTRYPOINT ["dotnet", "VedAstro.SelfHost.dll"]
