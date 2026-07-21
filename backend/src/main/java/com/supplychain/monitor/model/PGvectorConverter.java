package com.supplychain.monitor.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.postgresql.util.PGobject;
import com.pgvector.PGvector;

@Converter(autoApply = false)
public class PGvectorConverter implements AttributeConverter<PGvector, Object> {

    @Override
    public Object convertToDatabaseColumn(PGvector attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute;
    }

    @Override
    public PGvector convertToEntityAttribute(Object dbData) {
        if (dbData == null) {
            return null;
        }
        if (dbData instanceof PGvector) {
            return (PGvector) dbData;
        }
        if (dbData instanceof PGobject) {
            PGobject pgobject = (PGobject) dbData;
            try {
                return new PGvector(pgobject.getValue());
            } catch (Exception e) {
                throw new IllegalArgumentException("Error parsing PGobject value to PGvector", e);
            }
        }
        if (dbData instanceof String) {
            String value = (String) dbData;
            if (value.startsWith("[") && value.endsWith("]")) {
                value = value.substring(1, value.length() - 1);
            }
            if (value.trim().isEmpty()) {
                return new PGvector(new float[0]);
            }
            String[] parts = value.split(",");
            float[] floatArray = new float[parts.length];
            for (int i = 0; i < parts.length; i++) {
                floatArray[i] = Float.parseFloat(parts[i].trim());
            }
            return new PGvector(floatArray);
        }
        if (dbData instanceof float[]) {
            return new PGvector((float[]) dbData);
        }
        if (dbData instanceof Object[]) {
            Object[] arr = (Object[]) dbData;
            float[] floatArray = new float[arr.length];
            for (int i = 0; i < arr.length; i++) {
                floatArray[i] = ((Number) arr[i]).floatValue();
            }
            return new PGvector(floatArray);
        }
        throw new IllegalArgumentException("Unsupported database type for PGvector conversion: " + dbData.getClass().getName());
    }
}
